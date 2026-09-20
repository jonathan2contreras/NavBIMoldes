"""Derive stable floor bands from actual world-space GLB vertices, not panel codes."""
import numpy as np

FACADE_ORDER = ("oeste", "norte", "este", "sur")
FACADE_LABELS = {"oeste": "Oeste", "norte": "Norte", "este": "Este", "sur": "Sur"}
FLOOR_TOLERANCE_METRES = 0.75
STRICT_STRATEGY = "strict_floor_clockwise_v1"


class SpatialCatalog:
    def __init__(self, glb, world_matrix, read_accessor):
        self.glb, self.world_matrix, self.read_accessor = glb, world_matrix, read_accessor
        self.cache_key = None
        self.points = {}
        self.floors = []

    def locate(self, names, facades):
        glb = self.glb()
        if not glb.get("js"):
            return {}, []
        key = (id(glb["js"]), frozenset(names))
        if key != self.cache_key:
            self._build(names, glb)
            self.cache_key = key
        located = {}
        for name, point in self.points.items():
            facade = facades.get(name)
            # Match the viewer's cardinal assignments; never guess an unknown facade.
            if facade not in FACADE_ORDER:
                continue
            floor = point["floor_index"]
            x, _, z = point["center"]
            # West: SW->NW; North: NW->NE; East: NE->SE; South: SE->SW.
            along = {"oeste": -z, "norte": x, "este": z, "sur": -x}[facade]
            located[name] = {
                "floor_index": floor, "floor_label": self.floors[floor]["label"],
                "elevation": round(point["base"], 3), "facade": facade,
                "facade_label": FACADE_LABELS[facade],
                "stage_index": floor * 4 + FACADE_ORDER.index(facade),
                "along": round(along, 5), "center": point["center"],
            }
        ordered = sorted(located, key=lambda name: (located[name]["stage_index"], located[name]["along"], located[name]["elevation"], name))
        for index, name in enumerate(ordered):
            located[name]["sequence_index"] = index
            del located[name]["along"]
        return located, self.floors

    def _build(self, names, glb):
        points = {}
        for name in sorted(names):
            idx = glb["by_name"].get(name)
            if idx is None:
                continue
            node = glb["js"]["nodes"][idx]
            matrix = self.world_matrix(idx)
            vertices = []
            for primitive in glb["js"]["meshes"][node["mesh"]]["primitives"]:
                position = primitive.get("attributes", {}).get("POSITION")
                if position is not None:
                    local = self.read_accessor(position).astype(np.float64)
                    vertices.append(local @ matrix[:3, :3].T + matrix[:3, 3])
            if not vertices:
                continue
            world = np.vstack(vertices)
            if not world.size or not np.isfinite(world).all():
                continue
            low, high = world.min(axis=0), world.max(axis=0)
            points[name] = {"base": float(low[1]), "center": [round(float(v), 5) for v in (low + high) / 2]}
        groups = []
        for name in sorted(points, key=lambda name: (points[name]["base"], name)):
            if not groups or points[name]["base"] - points[groups[-1][0]]["base"] > FLOOR_TOLERANCE_METRES:
                groups.append([])
            groups[-1].append(name)
        floors = []
        for index, group in enumerate(groups):
            bases = [points[name]["base"] for name in group]
            floors.append({"index": index, "label": "Planta baja" if index == 0 else f"Planta {index}",
                           "elevation": round(float(np.median(bases)), 3), "model_panels": len(group)})
            for name in group:
                points[name]["floor_index"] = index
        self.points, self.floors = points, floors