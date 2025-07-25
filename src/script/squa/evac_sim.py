from __future__ import annotations
from shapely.ops import unary_union
import heapq, itertools
import geopandas as gpd
import networkx as nx
import argparse, sys, math
from shapely.geometry import Point, LineString
from pyproj import Transformer
from pathlib import Path
from typing import Tuple, List

DEFAULT_MESH = Path(__file__).parent / "outputs"
TARGET_CRS = "EPSG:32610"
HIWAY_TYPES = {"motorway", "trunk"}
IS_LINK = lambda rt: rt and rt.endswith("_link")
INF = float("inf")
SEA2SKY = ("sea-to-sky highway", "Sea-to-Sky Highway")

# highway or not according to name
def is_hiway(rt: str, name: str):
    return (rt in HIWAY_TYPES) or ("highway" in name)

# edge penalty, forbidden sea-to-sky highway to normal road, vice versa
def edge_penalized_weight(curr_attr, prev_attr, curr_node=None, prev_node=None, prev_prev_node=None):
    if prev_attr is None:
        return curr_attr["weight"]

    rt_c  = curr_attr.get("road_type", "")
    nm_c  = curr_attr.get("road_name", "")
    hi_c  = is_hiway(rt_c, nm_c)
    link_c= IS_LINK(rt_c)

    rt_p  = prev_attr.get("road_type", "")
    nm_p  = prev_attr.get("road_name", "")
    hi_p  = is_hiway(rt_p, nm_p)
    link_p= IS_LINK(rt_p)

    # sea-to-sky highway specific restriction
    sea_in  = any(k in nm_c for k in SEA2SKY)
    sea_out = any(k in nm_p for k in SEA2SKY)
    if sea_in ^ sea_out: # if *_link to sea-to-sky highway, then set the forbidden restriction
        if not (IS_LINK(rt_c) or IS_LINK(rt_p)):
            return INF

    if hi_c and not (hi_p or link_p):
        return curr_attr["weight"] * 20
    if hi_p and not (hi_c or link_c):
        return curr_attr["weight"] * 20

    if prev_prev_node: # calculate the turning angle if we have 3 points
        v1 = (prev_node[0]-prev_prev_node[0], prev_node[1]-prev_prev_node[1])
        v2 = (curr_node[0]-prev_node[0], curr_node[1]-prev_node[1])
        # compute the angle (via cosine)
        dot  = v1[0]*v2[0] + v1[1]*v2[1]
        norm = ((v1[0]**2+v1[1]**2)**0.5 * (v2[0]**2+v2[1]**2)**0.5)
        if norm > 0 and dot/norm < -0.9: # angle > ~155° (≈ U-turn)
            # if the turn happens on a trunk/motorway → forbid it outright, on ordinary roads we just give it a heavy penalty
            if curr_attr["road_type"] in {"trunk", "motorway"}:
                return float("inf")
            else:
                return curr_attr["weight"] * 20
    return curr_attr["weight"]

def to_wgs84(x: float, y: float) -> Tuple[float, float]:
    return Transformer.from_crs(TARGET_CRS, 4326, always_xy=True).transform(x, y)

def load_inputs(mesh_dir: Path):
    edges = gpd.read_file(mesh_dir / "mesh_edges.geojson").to_crs(TARGET_CRS)
    nodes = gpd.read_file(mesh_dir / "mesh_nodes.geojson").to_crs(TARGET_CRS)
    shelters = gpd.read_file(mesh_dir / "shelters.geojson").to_crs(TARGET_CRS)
    return edges, nodes, shelters

# mesh_edges to NetworkX DiGraph
def build_graph(edges: gpd.GeoDataFrame, fire_union, alpha: float) -> nx.Graph:
    G = nx.DiGraph()
    # collect link end
    link_eps: set[tuple[float,float]] = set()
    for _, r in edges.iterrows():
        rt = r.get("road_type","")
        if rt.endswith("_link"):
            pts = list(r.geometry.coords)
            link_eps.add(tuple(pts[0]))
            link_eps.add(tuple(pts[-1]))
    for _, row in edges.iterrows():
        # if it's motorway or trunk
        # and end not in link_eps, get over it
        rt = row.get("road_type","")
        a = tuple(row.geometry.coords[0])
        b = tuple(row.geometry.coords[-1])
        # use mesh_edges.geojson (oneway_dir) built edges
        dir_tag = ("FWD" if row.get("direction") == "forward" else "REV") if rt.endswith("_link") else row.get("oneway_dir", "BIDIR")
        base_cost = row.get("cost", row.length)
        inter_len = row.geometry.intersection(fire_union).length
        ratio     = inter_len / row.length
        weight    = base_cost * (1 + alpha * ratio)

        if dir_tag == "FWD":
            # 顺向单行
            G.add_edge(a, b,
                cost=base_cost, exp_ratio=ratio,
                weight=weight, road_type=rt,
                road_name=(row.get("road_name","") or "").lower(),
                oneway=True)
        elif dir_tag == "REV":
            # 逆向单行
            G.add_edge(b, a,
                cost=base_cost, exp_ratio=ratio,
                weight=weight, road_type=rt,
                road_name=(row.get("road_name","") or "").lower(),
                oneway=True)
        else:
            G.add_edge(a, b,
                cost=base_cost, exp_ratio=ratio,
                weight=weight, road_type=rt,
                road_name=(row.get("road_name","") or "").lower(),
                oneway=True)
            G.add_edge(b, a,
                cost=base_cost, exp_ratio=ratio,
                weight=weight, road_type=rt,
                road_name=(row.get("road_name","") or "").lower(),
                oneway=True)
    return G

def nearest_node(pt: Point, nodes: list[tuple]) -> tuple:
    # return nearest node near pt (x, y, layer)
    min_d, closest = float("inf"), None
    x0, y0 = pt.x, pt.y
    for node in nodes:
        x, y = node[0], node[1]    # only consider the first two
        d = (x - x0) ** 2 + (y - y0) ** 2
        if d < min_d:
            min_d, closest = d, node
    return closest

def nodes_list(nodes_gdf: gpd.GeoDataFrame) -> List[Tuple[float, float]]:
    return [(geom.x, geom.y) for geom in nodes_gdf.geometry]

def constrained_shortest_path(G: nx.DiGraph, source, target):
    # return cost and path list
    counter = itertools.count()
    pq   = [(0.0, next(counter), source,  None,     None,     None)]
    dist = {source: 0.0}
    parent = {} # node to parent

    while pq:
        du, _, u, prev_node, prev_prev, attr_u = heapq.heappop(pq)
        if u == target:
            break
        if du != dist[u]:
            continue

        # DiGraph
        for _, v, attr in G.out_edges(u, data=True):
            w = edge_penalized_weight(
                    attr,           # curr_attr
                    attr_u,         # prev_attr
                    v,              # curr_node
                    u,              # prev_node
                    prev_node       # prev_prev_node
                )
            if w == INF:
                continue
            dv = du + w
            if dv < dist.get(v, INF):
                dist[v] = dv
                parent[v] = (u, attr)
                heapq.heappush(
                    pq,
                    (dv, next(counter), v,     # 当前→下一层 node
                     u, prev_node,             # 新 prev_node / prev_prev
                     attr)
                )

    if target not in dist:
        raise nx.NetworkXNoPath

    path = [target]
    node = target
    while node != source:
        node, _ = parent[node]
        path.append(node)
    path.reverse()
    return dist[target], path

def path_to_latlon(path, swap=True):
    if swap:
        return [to_wgs84(x, y)[::-1] for x, y in path] # (lat, lon)
    else:
        return [to_wgs84(x, y) for x, y in path] # (lon, lat)

def run_evac(lat, lon, mesh_dir="outputs", alpha=3.0):
    mesh_dir = Path(mesh_dir)
    edges, nodes_gdf, shelters_gdf = load_inputs(mesh_dir)

    # read in fire
    fires = gpd.read_file(mesh_dir / ("fires.geojson")).to_crs(TARGET_CRS)
    fire_union = unary_union(fires.geometry)

    # graph
    G = build_graph(edges, fire_union, alpha)

    # start and end
    x0, y0 = Transformer.from_crs(4326, TARGET_CRS, always_xy=True).transform(lon, lat)
    start_node = nearest_node(Point(x0, y0), list(G.nodes()))

    best_cost, best_path = math.inf, None
    for _, srow in shelters_gdf.iterrows():
        sx, sy = srow.geometry.coords[0]
        shelter_node = nearest_node(Point(sx, sy), list(G.nodes()))
        try:
            cost, path = constrained_shortest_path(G, start_node, shelter_node)
            if cost < best_cost:
                best_cost, best_path, goal_node = cost, path, shelter_node
        except nx.NetworkXNoPath:
            continue

    if best_path is None:
        raise RuntimeError("No path to any shelter")

    return path_to_latlon(best_path), best_cost, fires, start_node, goal_node, best_path

def build_parser():
    p = argparse.ArgumentParser("Evacuation planner")
    p.add_argument("lat", type=float)
    p.add_argument("lon", type=float)
    p.add_argument("--mesh-dir", default=DEFAULT_MESH,         # ← 原来是 "outputs"
    type=Path,                    # 直接解析成 Path 对象
    help="目录包含 mesh_edges.geojson 等")
    p.add_argument("--alpha",    type=float, default=3.0)
    p.add_argument("--json", action="store_true", help="只输出标准 JSON 到 stdout（无文件写出）")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    mesh_dir = Path(args.mesh_dir).expanduser()
    if not mesh_dir.is_absolute():          # 仍然是相对路径
        mesh_dir = Path(__file__).parent / mesh_dir

    latlon_path, best_cost, fires, start_node, goal_node, utm_path= run_evac(
        args.lat, args.lon,
        mesh_dir=mesh_dir,
        alpha=args.alpha)

    resp = dict(
        route = latlon_path,
        cost_s= round(best_cost, 1),
        n_points=len(latlon_path),
        start = latlon_path[0],
        destination = latlon_path[-1]
    )

    if args.json:
        import json, sys
        json.dump(resp, sys.stdout, ensure_ascii=False)
        sys.stdout.flush()
        return

if __name__ == "__main__":
    main(sys.argv[1:])