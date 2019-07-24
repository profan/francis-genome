import os
import csv
import argparse

# our utils
import util

parser = argparse.ArgumentParser(description='Fetches all feature subsystem data for a given job.')
parser.add_argument(
    '--data-dir', metavar='data_dir', type=str, default=os.getcwd(),
    help='directory with tsv files'
)
parser.add_argument(
    '--no-simulate', default=False, action="store_true",
    help='set to actually perform the change'
)

args = parser.parse_args()
os.chdir(args.data_dir)

def parse_fig(fig):
    return fig.strip("fig|").split(".peg.")[0]

tsv_files = util.get_files_in_folder_with_ext(".tsv")
for path in tsv_files:
    with open(path, 'r') as csvfile:
        name, ext = os.path.splitext(path)
        reader = csv.DictReader(csvfile, delimiter='\t')
        first_row = next(reader, None)
        if first_row is None:
            print("[rename_tables] no data for %s, continuing with next file" % path)
            continue
        features = [f.strip() for f in first_row['Features'].split(",")]
        if len(features) > 0:
            stripped_fig = parse_fig(features[0])
            new_file_name = stripped_fig + "_features" + ".tsv"
            print("[rename_tables] rename %s to %s" % (path, new_file_name))
            if args.no_simulate:
                os.rename(path, new_file_name)
        else:
            print("[rename_tables] %s had no features?" % path)
