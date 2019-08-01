import os
import sys
import csv
import json
import argparse

# our utils
import util

# FIXME: this is probably the wrong way to go about this..
csv.field_size_limit(sys.maxsize)

# the only purpose of this file is to collate the various data into a unified format
#  for feeding into our javascript visualization, so we can depend on the format we specify here
#  instead of a spread of various data files whose format may change.

parser = argparse.ArgumentParser(description='Collate protein data for use in js visualization.')
parser.add_argument(
    '--all-proteins', metavar='all_proteins', type=str, required=True,
    help='the csv file with all proteins in it.'
)

parser.add_argument(
    '--subsystems-dir', metavar='subsystems_dir', type=str, required=True,
    help='the directory with the files containing the subsystem data in it.'
)

args = parser.parse_args()
cur_dir = os.getcwd()

protein_data = {}

all_proteins_file = args.all_proteins
subsystems_dir = args.subsystems_dir

# slightly hacky, but necessary
feature_id_to_fig_mapping = {}

all_protein_data = {}
with open(all_proteins_file, 'r') as csvfile:

    reader = csv.DictReader(csvfile)

    for row in reader:

        figfam_id = row['figfam']
        functions_list = [f.strip() for f in row['function'].split(";")]
        features_list = [f.strip() for f in row['feature_ids'].split(";")]
        contigs_list = [c.strip() for c in row['contig_ids'].split(";")]
        all_protein_data[figfam_id] = {
            'functions' : functions_list,
            'feature_ids' : features_list,
            'contig_ids' : contigs_list
        }

        for f in features_list:
            feature_id_to_fig_mapping[f] = figfam_id


os.chdir(args.subsystems_dir)
files_in_subsystems_dir = util.get_files_in_folder_with_ext(".tsv")
print("[collate_data] got: %d files with subsystems data to process..." % len(files_in_subsystems_dir))

skipped_rows = 0
processed_rows = 0
for entry in files_in_subsystems_dir:

    with open(entry, 'r') as csvfile:

        reader = csv.DictReader(csvfile, delimiter='\t')
        skipped_rows = 0

        for row in reader:

            category = row['Category']
            subcategory = row['Subcategory']
            subsystem = row['Subsystem']
            role = row['Role']

            features = [f.strip() for f in row['Features'].split(",")]
            if features[0] not in feature_id_to_fig_mapping:
                skipped_rows += 1
                continue
            else:
                processed_rows += 1
                figfam_id = feature_id_to_fig_mapping[features[0]]

            # append our category data
            data = all_protein_data[figfam_id]
            data['category'] = category
            data['subcategory'] = subcategory
            data['subsystem'] = subsystem
            data['role'] = role

            all_protein_data[figfam_id] = data

total_rows = skipped_rows + processed_rows
total_percentage_skipped = (skipped_rows / float(total_rows)) * 100.0
print("[collate_data] skipped %d rows from total of %d entries, skipped %f procent" \
      % (skipped_rows, total_rows, total_percentage_skipped))

output_file_path = os.path.join(cur_dir, 'output/proteins.json')
with open(output_file_path, 'w') as f:
    json.dump(all_protein_data, f)
    print("[collate_data] wrote data with %d proteins to: %s" % (len(all_protein_data), output_file_path))