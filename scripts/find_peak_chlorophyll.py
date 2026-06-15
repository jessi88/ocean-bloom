from pathlib import Path
import pandas as pd


# ------------------------------------------------------------
# Every Second Breath
# Find peak regional chlorophyll-a date
# ------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]

INPUT_FILE = (
    PROJECT_ROOT
    / "src"
    / "data"
    / "processed"
    / "regional_daily_surface_bgc_2024-03-01_2024-06-30.csv"
)

regional = pd.read_csv(INPUT_FILE)

peak_row = regional.loc[regional["chl"].idxmax()]

print("Peak chlorophyll date:")
print(peak_row[["time", "chl", "phyc", "nppv", "no3", "o2"]])