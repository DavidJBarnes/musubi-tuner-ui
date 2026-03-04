import subprocess

from ..schemas import GpuStats


def get_gpu_stats() -> GpuStats:
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            return GpuStats()

        line = result.stdout.strip().split("\n")[0]
        parts = [p.strip() for p in line.split(",")]
        return GpuStats(
            name=parts[0],
            vram_used_mb=int(parts[1]),
            vram_total_mb=int(parts[2]),
            utilization_pct=int(parts[3]),
            temperature_c=int(parts[4]),
            available=True,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
        return GpuStats()
