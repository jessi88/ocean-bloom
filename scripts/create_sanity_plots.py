from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


# ------------------------------------------------------------
# Every Second Breath
# Sanity plots for processed Copernicus Marine data
# ------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]

PROCESSED_DIR = PROJECT_ROOT / "src" / "data" / "processed"
PLOTS_DIR = PROJECT_ROOT / "src" / "plots" / "sanity"

PLOTS_DIR.mkdir(parents=True, exist_ok=True)

BREATH_CURTAIN_FILE = PROCESSED_DIR / "breath_curtain_chl_daily.csv"
REGIONAL_FILE = PROCESSED_DIR / "regional_daily_surface_bgc_2024-03-01_2024-06-30.csv"
SNAPSHOTS_FILE = PROCESSED_DIR / "map_snapshots_chl_before_peak_fade.csv"


def plot_breath_curtain() -> None:
    """
    Plot chlorophyll-a as a time × latitude heatmap.
    This helps decide whether the breath curtain is visually strong enough
    to become the central visual climax.
    """
    df = pd.read_csv(BREATH_CURTAIN_FILE)
    df["time"] = pd.to_datetime(df["time"])

    curtain = df.pivot(index="latitude", columns="time", values="chl")
    curtain = curtain.sort_index(ascending=True)

    fig, ax = plt.subplots(figsize=(13, 7))

    image = ax.imshow(
        curtain.values,
        aspect="auto",
        origin="lower",
        extent=[
            curtain.columns.min(),
            curtain.columns.max(),
            curtain.index.min(),
            curtain.index.max(),
        ],
    )

    ax.set_title("Breath curtain: daily chlorophyll-a by latitude")
    ax.set_xlabel("Time")
    ax.set_ylabel("Latitude")

    cbar = fig.colorbar(image, ax=ax)
    cbar.set_label("Chlorophyll-a")

    fig.autofmt_xdate()
    fig.tight_layout()

    output_file = PLOTS_DIR / "01_breath_curtain_chl_daily.png"
    fig.savefig(output_file, dpi=180)
    plt.close(fig)

    print(f"Saved: {output_file.relative_to(PROJECT_ROOT)}")


def plot_regional_lines() -> None:
    """
    Plot regional daily averages for key variables.
    Each variable gets its own figure so scale differences do not
    distort the interpretation.
    """
    df = pd.read_csv(REGIONAL_FILE)
    df["time"] = pd.to_datetime(df["time"])

    variables = [
        ("chl", "Chlorophyll-a"),
        ("phyc", "Phytoplankton carbon biomass"),
        ("nppv", "Net primary production"),
        ("no3", "Nitrate"),
        ("o2", "Dissolved oxygen"),
    ]

    for variable, label in variables:
        fig, ax = plt.subplots(figsize=(11, 4.5))

        ax.plot(df["time"], df[variable], linewidth=2)
        ax.scatter(df["time"], df[variable], s=10)

        peak_idx = df[variable].idxmax()
        peak_time = df.loc[peak_idx, "time"]
        peak_value = df.loc[peak_idx, variable]

        ax.scatter([peak_time], [peak_value], s=70)
        ax.annotate(
            f"max: {peak_time:%Y-%m-%d}",
            xy=(peak_time, peak_value),
            xytext=(12, 16),
            textcoords="offset points",
            arrowprops={"arrowstyle": "->", "linewidth": 1},
        )

        ax.set_title(f"Regional daily average: {label}")
        ax.set_xlabel("Time")
        ax.set_ylabel(variable)

        fig.autofmt_xdate()
        fig.tight_layout()

        output_file = PLOTS_DIR / f"02_regional_{variable}_daily.png"
        fig.savefig(output_file, dpi=180)
        plt.close(fig)

        print(f"Saved: {output_file.relative_to(PROJECT_ROOT)}")


def plot_snapshot_maps() -> None:
    """
    Plot chlorophyll-a map snapshots:
    before bloom, peak bloom, and fading bloom.
    """
    df = pd.read_csv(SNAPSHOTS_FILE)

    snapshot_order = ["before", "peak", "fade"]

    for snapshot in snapshot_order:
        snapshot_df = df[df["snapshot"] == snapshot].copy()

        if snapshot_df.empty:
            print(f"Warning: no data found for snapshot '{snapshot}'")
            continue

        snapshot_time = snapshot_df["time"].iloc[0]

        grid = snapshot_df.pivot(
            index="latitude",
            columns="longitude",
            values="chl",
        )

        grid = grid.sort_index(ascending=True)

        fig, ax = plt.subplots(figsize=(8, 6))

        image = ax.imshow(
            grid.values,
            aspect="auto",
            origin="lower",
            extent=[
                grid.columns.min(),
                grid.columns.max(),
                grid.index.min(),
                grid.index.max(),
            ],
        )

        ax.set_title(f"Chlorophyll-a map snapshot: {snapshot} · {snapshot_time}")
        ax.set_xlabel("Longitude")
        ax.set_ylabel("Latitude")

        cbar = fig.colorbar(image, ax=ax)
        cbar.set_label("Chlorophyll-a")

        fig.tight_layout()

        output_file = PLOTS_DIR / f"03_snapshot_map_chl_{snapshot}.png"
        fig.savefig(output_file, dpi=180)
        plt.close(fig)

        print(f"Saved: {output_file.relative_to(PROJECT_ROOT)}")


def main() -> None:
    print("Creating sanity plots...")

    plot_breath_curtain()
    plot_regional_lines()
    plot_snapshot_maps()

    print("\nDone.")
    print(f"Plots saved in: {PLOTS_DIR.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()