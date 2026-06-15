from pathlib import Path
import os
import copernicusmarine
import xarray as xr
import pandas as pd


# ------------------------------------------------------------
# Every Second Breath
# Download + process North Atlantic spring bloom data
# March–June 2024
# ------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]

RAW_DIR = PROJECT_ROOT / "src" / "data" / "raw"
PROCESSED_DIR = PROJECT_ROOT / "src" / "data" / "processed"

RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


# ------------------------------------------------------------
# Copernicus Marine credentials
# ------------------------------------------------------------

USERNAME = os.getenv("COPERNICUSMARINE_USERNAME")
PASSWORD = os.getenv("COPERNICUSMARINE_PASSWORD")

if not USERNAME or not PASSWORD:
    raise ValueError(
        "Missing Copernicus Marine credentials. "
        "Please set COPERNICUSMARINE_USERNAME and COPERNICUSMARINE_PASSWORD."
    )

copernicusmarine.login(
    username=USERNAME,
    password=PASSWORD,
)


# ------------------------------------------------------------
# Shared extraction settings
# ------------------------------------------------------------

MIN_LON = -60
MAX_LON = -10
MIN_LAT = 35
MAX_LAT = 65

START_DATE = "2024-03-01T00:00:00"
END_DATE = "2024-06-30T00:00:00"

SURFACE_DEPTH = 0.4940253794193268

CHL_PHYC_FILE = RAW_DIR / "north_atlantic_chl_phyc_daily_surface_2024-03-01_2024-06-30.nc"
NPPV_O2_FILE = RAW_DIR / "north_atlantic_nppv_o2_daily_surface_2024-03-01_2024-06-30.nc"
NO3_FILE = RAW_DIR / "north_atlantic_no3_daily_surface_2024-03-01_2024-06-30.nc"
ZOOC_FILE = RAW_DIR / "north_atlantic_zooc_daily_surface_2024-03-01_2024-06-30.nc"
DISSIC_FILE = RAW_DIR / "north_atlantic_dissic_daily_surface_2024-03-01_2024-06-30.nc"
SPCO2_FILE = RAW_DIR / "north_atlantic_spco2_daily_surface_2024-03-01_2024-06-30.nc"

CONTEXT_PEAK_CHL_FILE = (
    RAW_DIR / "north_atlantic_context_peak_chl_surface_2024-04-24_80W_20E_25N_80N.nc"
)

CONTEXT_PEAK_CHL_CSV = (
    PROCESSED_DIR / "peak_map_chl_context_2024-04-24_80W_20E_25N_80N.csv"
)


# ------------------------------------------------------------
# Northern Hemisphere chlorophyll context
# ------------------------------------------------------------

HEMISPHERE_CHL_FILE = (
    RAW_DIR
    / "northern_hemisphere_chl_daily_surface_2024-01-01_2024-06-30.nc"
)

HEMISPHERE_WEEKLY_CHL_CSV = (
    PROCESSED_DIR
    / "northern_hemisphere_chl_weekly_snapshots_1deg_2024-01-01_2024-06-30.csv"
)

HEMISPHERE_WEEKLY_DATES_CSV = (
    PROCESSED_DIR
    / "northern_hemisphere_chl_weekly_snapshot_dates_2024-01-01_2024-06-30.csv"
)

HEMISPHERE_REGION = {
    "minimum_longitude": -180,
    "maximum_longitude": 179.75,
    "minimum_latitude": 0,
    "maximum_latitude": 90,
}


# ------------------------------------------------------------
# Coastline context
# ------------------------------------------------------------

COASTLINES_HEMISPHERE_GEOJSON = (
    PROCESSED_DIR / "coastlines_northern_hemisphere_110m.geojson"
)

COASTLINES_NORTH_ATLANTIC_GEOJSON = (
    PROCESSED_DIR / "coastlines_north_atlantic_50m.geojson"
)



# ------------------------------------------------------------
# Download helpers
# ------------------------------------------------------------

def download_subset(
    dataset_id: str,
    variables: list[str],
    output_file: Path,
    overwrite: bool = True,
    dry_run: bool = False,
):
    print(f"\nDownloading: {output_file.name}")
    print(f"Dataset: {dataset_id}")
    print(f"Variables: {variables}")

    response = copernicusmarine.subset(
        dataset_id=dataset_id,
        variables=variables,
        minimum_longitude=MIN_LON,
        maximum_longitude=MAX_LON,
        minimum_latitude=MIN_LAT,
        maximum_latitude=MAX_LAT,
        start_datetime=START_DATE,
        end_datetime=END_DATE,
        minimum_depth=SURFACE_DEPTH,
        maximum_depth=SURFACE_DEPTH,
        output_directory=output_file.parent,
        output_filename=output_file.name,
        file_format="netcdf",
        overwrite=overwrite,
        dry_run=dry_run,
    )

    print(response)
    return response


def download_surface_subset(
    dataset_id: str,
    variables: list[str],
    output_file: Path,
    overwrite: bool = True,
    dry_run: bool = False,
):
    """
    Download a surface-only 2D dataset.

    Used for variables such as spco2, which do not have a depth dimension.
    """
    print(f"\nDownloading: {output_file.name}")
    print(f"Dataset: {dataset_id}")
    print(f"Variables: {variables}")

    response = copernicusmarine.subset(
        dataset_id=dataset_id,
        variables=variables,
        minimum_longitude=MIN_LON,
        maximum_longitude=MAX_LON,
        minimum_latitude=MIN_LAT,
        maximum_latitude=MAX_LAT,
        start_datetime=START_DATE,
        end_datetime=END_DATE,
        output_directory=output_file.parent,
        output_filename=output_file.name,
        file_format="netcdf",
        overwrite=overwrite,
        dry_run=dry_run,
    )

    print(response)
    return response


def download_context_peak_map(
    output_file: Path,
    overwrite: bool = True,
    dry_run: bool = False,
):
    """
    Download a wider North Atlantic chlorophyll-a map for geographic context.

    This file is used only for the PeakBloomMap visual. The wider extent helps
    viewers recognize Greenland, Iceland, Newfoundland/Labrador, Western Europe,
    and the broader North Atlantic basin.

    Main analytical files remain focused on:
    60°W to 10°W, 35°N to 65°N.
    """
    print(f"\nDownloading context peak map: {output_file.name}")
    print("Dataset: cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m")
    print("Variables: ['chl']")
    print("Region: 80°W to 20°E, 25°N to 80°N")
    print("Date: 2024-04-24")

    response = copernicusmarine.subset(
        dataset_id="cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m",
        variables=["chl"],
        minimum_longitude=-80,
        maximum_longitude=20,
        minimum_latitude=25,
        maximum_latitude=80,
        start_datetime="2024-04-24T00:00:00",
        end_datetime="2024-04-24T00:00:00",
        minimum_depth=SURFACE_DEPTH,
        maximum_depth=SURFACE_DEPTH,
        output_directory=output_file.parent,
        output_filename=output_file.name,
        file_format="netcdf",
        overwrite=overwrite,
        dry_run=dry_run,
    )

    print(response)
    return response


def download_hemisphere_chlorophyll(
    output_file: Path,
    overwrite: bool = True,
    dry_run: bool = False,
):
    """
    Download daily surface chlorophyll-a for the Northern Hemisphere.

    This is used for the planetary / hemispheric bloom animation:
    January–June 2024, surface layer, full Northern Hemisphere.
    """
    print(f"\nDownloading Northern Hemisphere chlorophyll: {output_file.name}")
    print("Dataset: cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m")
    print("Variables: ['chl']")
    print("Region: 180°W to 180°E, 0°N to 90°N")
    print("Time: 2024-01-01 to 2024-06-30")

    response = copernicusmarine.subset(
        dataset_id="cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m",
        variables=["chl"],
        minimum_longitude=HEMISPHERE_REGION["minimum_longitude"],
        maximum_longitude=HEMISPHERE_REGION["maximum_longitude"],
        minimum_latitude=HEMISPHERE_REGION["minimum_latitude"],
        maximum_latitude=HEMISPHERE_REGION["maximum_latitude"],
        start_datetime="2024-01-01T00:00:00",
        end_datetime="2024-06-30T00:00:00",
        minimum_depth=SURFACE_DEPTH,
        maximum_depth=SURFACE_DEPTH,
        output_directory=output_file.parent,
        output_filename=output_file.name,
        file_format="netcdf",
        overwrite=overwrite,
        dry_run=dry_run,
    )

    print(response)
    return response


def inspect_file(file_path: Path, variables: list[str]) -> None:
    print(f"\nInspecting: {file_path.relative_to(PROJECT_ROOT)}")

    ds = xr.open_dataset(file_path)

    print(ds)

    print("\nValue ranges:")
    for var in variables:
        print(f"{var:<5} min: {float(ds[var].min()):.6g}")
        print(f"{var:<5} max: {float(ds[var].max()):.6g}")

    ds.close()


def export_cartopy_coastlines_geojson(
    output_file: Path,
    bounds: tuple[float, float, float, float],
    resolution: str = "110m",
) -> None:
    """
    Export Natural Earth coastlines as clipped GeoJSON.

    This creates lightweight coastline context layers for the React/D3 maps.

    bounds order:
    lon_min, lon_max, lat_min, lat_max
    """
    import json

    import cartopy.io.shapereader as shpreader
    from shapely.geometry import box, mapping
    from shapely.ops import unary_union

    lon_min, lon_max, lat_min, lat_max = bounds

    print(f"\nExporting coastlines: {output_file.relative_to(PROJECT_ROOT)}")
    print(f"Bounds: lon {lon_min} to {lon_max}, lat {lat_min} to {lat_max}")
    print(f"Resolution: {resolution}")

    output_file.parent.mkdir(parents=True, exist_ok=True)

    coastline_path = shpreader.natural_earth(
        resolution=resolution,
        category="physical",
        name="coastline",
    )

    reader = shpreader.Reader(coastline_path)
    clip_box = box(lon_min, lat_min, lon_max, lat_max)

    features = []

    for geometry in reader.geometries():
        if not geometry.intersects(clip_box):
            continue

        clipped = geometry.intersection(clip_box)

        if clipped.is_empty:
            continue

        features.append(
            {
                "type": "Feature",
                "properties": {},
                "geometry": mapping(clipped),
            }
        )

    geojson = {
        "type": "FeatureCollection",
        "name": output_file.stem,
        "features": features,
    }

    with output_file.open("w", encoding="utf-8") as file:
        json.dump(geojson, file)

    print(f"Exported {len(features)} coastline features")

# ------------------------------------------------------------
# Processing helpers
# ------------------------------------------------------------

def create_breath_curtain(
    input_file: Path,
    output_file: Path,
) -> None:
    """
    Create the main breath curtain dataset:
    time × latitude, with chlorophyll-a averaged across longitude.
    """
    print(f"\nCreating breath curtain: {output_file.relative_to(PROJECT_ROOT)}")

    ds = xr.open_dataset(input_file)

    chl = ds["chl"].squeeze("depth", drop=True)

    # Average across longitude to create a time × latitude curtain.
    breath_curtain = chl.mean(dim="longitude", skipna=True)

    df = breath_curtain.to_dataframe(name="chl").reset_index()

    df["time"] = pd.to_datetime(df["time"]).dt.strftime("%Y-%m-%d")
    df["latitude"] = df["latitude"].round(2)
    df["chl"] = df["chl"].round(6)

    df.to_csv(output_file, index=False)

    print(df.head())
    print(df.tail())

    ds.close()


def regional_mean_timeseries(
    file_path: Path,
    variables: list[str],
) -> pd.DataFrame:
    """
    Average selected variables over latitude and longitude.
    Result: one regional value per day for each variable.

    Handles both:
    - 3D surface files with a depth dimension
    - 2D surface-only files such as spco2
    """
    ds = xr.open_dataset(file_path)

    data = {}

    for var in variables:
        arr = ds[var]

        if "depth" in arr.dims:
            arr = arr.squeeze("depth", drop=True)

        ts = arr.mean(dim=["latitude", "longitude"], skipna=True)
        data[var] = ts.to_series()

    ds.close()

    return pd.DataFrame(data)


def create_regional_daily_bgc(
    chl_phyc_file: Path,
    nppv_o2_file: Path,
    no3_file: Path,
    zooc_file: Path,
    dissic_file: Path,
    spco2_file: Path,
    output_file: Path,
) -> None:
    """
    Create regional daily averages:
    chl, phyc, nppv, o2, no3, zooc, dissic, spco2.

    Act IV additions:
    zooc   = total zooplankton carbon concentration
    dissic = dissolved inorganic carbon
    spco2  = surface partial pressure of carbon dioxide in seawater
    """
    print(f"\nCreating regional daily BGC file: {output_file.relative_to(PROJECT_ROOT)}")

    chl_phyc = regional_mean_timeseries(chl_phyc_file, ["chl", "phyc"])
    nppv_o2 = regional_mean_timeseries(nppv_o2_file, ["nppv", "o2"])
    no3 = regional_mean_timeseries(no3_file, ["no3"])
    zooc = regional_mean_timeseries(zooc_file, ["zooc"])
    dissic = regional_mean_timeseries(dissic_file, ["dissic"])
    spco2 = regional_mean_timeseries(spco2_file, ["spco2"])

    df = pd.concat(
        [chl_phyc, nppv_o2, no3, zooc, dissic, spco2],
        axis=1,
    ).reset_index()

    df = df.rename(columns={"index": "time"})
    df["time"] = pd.to_datetime(df["time"]).dt.strftime("%Y-%m-%d")

    for col in ["chl", "phyc", "nppv", "o2", "no3", "zooc", "dissic", "spco2"]:
        df[col] = df[col].round(6)

    df.to_csv(output_file, index=False)

    print(df.head())
    print(df.tail())
    print(df.describe())


def create_map_snapshots_chl(
    input_file: Path,
    output_file: Path,
) -> None:
    """
    Create chlorophyll-a map snapshots:
    before bloom, peak bloom, and fading bloom.
    """
    print(f"\nCreating map snapshots: {output_file.relative_to(PROJECT_ROOT)}")

    snapshot_dates = {
        "before": "2024-03-15",
        "peak": "2024-04-24",
        "fade": "2024-06-15",
    }

    ds = xr.open_dataset(input_file)
    chl = ds["chl"].squeeze("depth", drop=True)

    frames = []

    for snapshot_name, date in snapshot_dates.items():
        snapshot = chl.sel(time=date, method="nearest")

        df_snapshot = snapshot.to_dataframe(name="chl").reset_index()
        df_snapshot["snapshot"] = snapshot_name
        df_snapshot["time"] = pd.to_datetime(df_snapshot["time"]).dt.strftime("%Y-%m-%d")
        df_snapshot["latitude"] = df_snapshot["latitude"].round(2)
        df_snapshot["longitude"] = df_snapshot["longitude"].round(2)
        df_snapshot["chl"] = df_snapshot["chl"].round(6)

        frames.append(df_snapshot)

    df = pd.concat(frames, ignore_index=True)
    df = df[["snapshot", "time", "latitude", "longitude", "chl"]]

    df.to_csv(output_file, index=False)

    print(df.head())
    print(df.tail())
    print(df.groupby("snapshot")["chl"].describe())

    ds.close()


def create_context_peak_map_chl(
    input_file: Path,
    output_file: Path,
) -> None:
    """
    Create a wider geographic context peak bloom map.

    Output columns:
    time, latitude, longitude, chl

    This CSV feeds the React PeakBloomMap.
    """
    print(f"\nCreating context peak map: {output_file.relative_to(PROJECT_ROOT)}")

    ds = xr.open_dataset(input_file)

    chl = ds["chl"].squeeze("depth", drop=True)

    snapshot = chl.sel(time="2024-04-24", method="nearest")

    df = snapshot.to_dataframe(name="chl").reset_index()

    df["time"] = pd.to_datetime(df["time"]).dt.strftime("%Y-%m-%d")
    df["latitude"] = df["latitude"].round(2)
    df["longitude"] = df["longitude"].round(2)
    df["chl"] = df["chl"].round(6)

    df = df[["time", "latitude", "longitude", "chl"]]

    df.to_csv(output_file, index=False)

    print(df.head())
    print(df.tail())
    print(df["chl"].describe())

    ds.close()

def create_hemisphere_weekly_chl_snapshots(
    input_file: Path,
    output_file: Path,
    dates_output_file: Path,
    coarsen_factor: int = 4,
) -> None:
    """
    Create weekly Northern Hemisphere chlorophyll-a snapshots for the website.

    Processing choices:
    - daily data are averaged into 7-day weekly windows starting on 2024-01-01
    - the 0.25° grid is coarsened to ~1° for browser performance
    - output remains CSV for easy loading in Vite/React

    Output columns:
    snapshot, week_start, week_end, latitude, longitude, chl
    """
    print(f"\nCreating weekly hemisphere chlorophyll snapshots:")
    print(f"Input:  {input_file.relative_to(PROJECT_ROOT)}")
    print(f"Output: {output_file.relative_to(PROJECT_ROOT)}")

    ds = xr.open_dataset(input_file)

    chl = ds["chl"].squeeze("depth", drop=True)

    # Weekly means from the daily source data.
    weekly = chl.resample(time="7D", origin=pd.Timestamp("2024-01-01")).mean()

    # Coarsen from 0.25° to ~1°.
    # This keeps the hemispheric animation light enough for the website.
    weekly_1deg = weekly.coarsen(
        latitude=coarsen_factor,
        longitude=coarsen_factor,
        boundary="trim",
    ).mean()

    df = weekly_1deg.to_dataframe(name="chl").reset_index()

    df["is_land"] = df["chl"].isna()
    df = df.copy()

    unique_times = sorted(pd.to_datetime(df["time"]).unique())
    snapshot_lookup = {
        time: f"week_{index + 1:02d}" for index, time in enumerate(unique_times)
    }

    df["time"] = pd.to_datetime(df["time"])
    df["snapshot"] = df["time"].map(snapshot_lookup)
    df["week_start"] = df["time"].dt.strftime("%Y-%m-%d")
    df["week_end"] = (df["time"] + pd.Timedelta(days=6)).dt.strftime("%Y-%m-%d")

    df["latitude"] = df["latitude"].round(3)
    df["longitude"] = df["longitude"].round(3)
    df["chl"] = df["chl"].round(6)

    df = df[
        [
            "snapshot",
            "week_start",
            "week_end",
            "latitude",
            "longitude",
            "chl",
            "is_land",
        ]
    ]

    df.to_csv(output_file, index=False)

    dates = (
        df[["snapshot", "week_start", "week_end"]]
        .drop_duplicates()
        .sort_values("snapshot")
        .reset_index(drop=True)
    )
    dates.to_csv(dates_output_file, index=False)

    print(df.head())
    print(df.tail())
    print("\nWeekly snapshot dates:")
    print(dates)

    print("\nChlorophyll summary:")
    print(df["chl"].describe())

    ds.close()


# ------------------------------------------------------------
# Main workflow
# ------------------------------------------------------------

def main() -> None:
    # Set DRY_RUN = True to test requests without downloading files.
    DRY_RUN = False

    download_subset(
        dataset_id="cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m",
        variables=["chl", "phyc"],
        output_file=CHL_PHYC_FILE,
        dry_run=DRY_RUN,
    )

    download_subset(
        dataset_id="cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m",
        variables=["nppv", "o2"],
        output_file=NPPV_O2_FILE,
        dry_run=DRY_RUN,
    )

    download_subset(
        dataset_id="cmems_mod_glo_bgc-nut_anfc_0.25deg_P1D-m",
        variables=["no3"],
        output_file=NO3_FILE,
        dry_run=DRY_RUN,
    )

    download_subset(
        dataset_id="cmems_mod_glo_bgc-plankton_anfc_0.25deg_P1D-m",
        variables=["zooc"],
        output_file=ZOOC_FILE,
        dry_run=DRY_RUN,
    )

    download_subset(
        dataset_id="cmems_mod_glo_bgc-car_anfc_0.25deg_P1D-m",
        variables=["dissic"],
        output_file=DISSIC_FILE,
        dry_run=DRY_RUN,
    )

    download_surface_subset(
        dataset_id="cmems_mod_glo_bgc-co2_anfc_0.25deg_P1D-m",
        variables=["spco2"],
        output_file=SPCO2_FILE,
        dry_run=DRY_RUN,
    )

    download_context_peak_map(
        output_file=CONTEXT_PEAK_CHL_FILE,
        dry_run=DRY_RUN,
    )

    download_hemisphere_chlorophyll(
        output_file=HEMISPHERE_CHL_FILE,
        dry_run=DRY_RUN,
    )

    if DRY_RUN:
        print("\nDry run complete. No files were downloaded or processed.")
        return

    inspect_file(CHL_PHYC_FILE, ["chl", "phyc"])
    inspect_file(NPPV_O2_FILE, ["nppv", "o2"])
    inspect_file(NO3_FILE, ["no3"])
    inspect_file(ZOOC_FILE, ["zooc"])
    inspect_file(DISSIC_FILE, ["dissic"])
    inspect_file(SPCO2_FILE, ["spco2"])
    inspect_file(CONTEXT_PEAK_CHL_FILE, ["chl"])
    inspect_file(HEMISPHERE_CHL_FILE, ["chl"])

    create_breath_curtain(
        input_file=CHL_PHYC_FILE,
        output_file=PROCESSED_DIR / "breath_curtain_chl_daily.csv",
    )

    create_map_snapshots_chl(
        input_file=CHL_PHYC_FILE,
        output_file=PROCESSED_DIR / "map_snapshots_chl_before_peak_fade.csv",
    )

    create_context_peak_map_chl(
        input_file=CONTEXT_PEAK_CHL_FILE,
        output_file=CONTEXT_PEAK_CHL_CSV,
    )

    create_hemisphere_weekly_chl_snapshots(
        input_file=HEMISPHERE_CHL_FILE,
        output_file=HEMISPHERE_WEEKLY_CHL_CSV,
        dates_output_file=HEMISPHERE_WEEKLY_DATES_CSV,
    )

    create_regional_daily_bgc(
        chl_phyc_file=CHL_PHYC_FILE,
        nppv_o2_file=NPPV_O2_FILE,
        no3_file=NO3_FILE,
        zooc_file=ZOOC_FILE,
        dissic_file=DISSIC_FILE,
        spco2_file=SPCO2_FILE,
        output_file=PROCESSED_DIR / "regional_daily_surface_bgc_2024-03-01_2024-06-30.csv",
    )

    export_cartopy_coastlines_geojson(
        output_file=COASTLINES_HEMISPHERE_GEOJSON,
        bounds=(-180, 180, 0, 90),
        resolution="110m",
    )

    export_cartopy_coastlines_geojson(
        output_file=COASTLINES_NORTH_ATLANTIC_GEOJSON,
        bounds=(-60, -10, 35, 65),
        resolution="50m",
    )

    print("\nAll done.")
    print("Created:")
    print((PROCESSED_DIR / "breath_curtain_chl_daily.csv").relative_to(PROJECT_ROOT))
    print((PROCESSED_DIR / "map_snapshots_chl_before_peak_fade.csv").relative_to(PROJECT_ROOT))
    print((PROCESSED_DIR / "regional_daily_surface_bgc_2024-03-01_2024-06-30.csv").relative_to(PROJECT_ROOT))
    print(ZOOC_FILE.relative_to(PROJECT_ROOT))
    print(CONTEXT_PEAK_CHL_CSV.relative_to(PROJECT_ROOT))
    print(HEMISPHERE_CHL_FILE.relative_to(PROJECT_ROOT))
    print(HEMISPHERE_WEEKLY_CHL_CSV.relative_to(PROJECT_ROOT))
    print(HEMISPHERE_WEEKLY_DATES_CSV.relative_to(PROJECT_ROOT))
    print(COASTLINES_HEMISPHERE_GEOJSON.relative_to(PROJECT_ROOT))
    print(COASTLINES_NORTH_ATLANTIC_GEOJSON.relative_to(PROJECT_ROOT))


if __name__ == "__main__":
    main()