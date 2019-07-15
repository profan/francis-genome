import os
import csv
import argparse

# contig id may look like 58282 but also 28582_5929_etc
def get_leading_id(s):
    return s.split("_", 1)[0]

parser = argparse.ArgumentParser(description='Calculates proteins common to all genomes in directory, outputting a spreadsheet for the proteins common to all genomes and a spreadsheet which holds all the proteins unique to each genome, marked with which genome to which they are unique, if any.')
parser.add_argument(
    'directory', type=str, default=os.getcwd(), nargs="?",
    help='the directory with the csv files of the genomes in it (defaults to current directory)'
)

args = parser.parse_args()
cur_dir = os.getcwd()

# workaround
os.chdir(args.directory)
files = os.listdir()

# first collect all proteins associated with each file
all_protein_data = {}
skipped_entries = 0
total_entries = 0

data_files = []
for entry in files:
    have_fetched_contig_id = False
    filename, file_ext = os.path.splitext(entry)
    if os.path.isfile(entry) and file_ext == '.csv':
        with open(entry) as csvfile:
            reader = csv.DictReader(csvfile)
            proteins = set() # to automatically eliminate duplicates
            contig_id = -1
            for row in reader:
                # keep track of total number of entries
                total_entries += 1
                if not have_fetched_contig_id:
                    have_fetched_contig_id = True
                    contig_id = get_leading_id(row['contig_id'])
                # we only care about the row if it has a figfam entry, and it is nonempty
                if 'figfam' in row and not row['figfam'].isspace() and not row['figfam'] == "":
                    fig = row['figfam']
                    proteins.add(fig)
                    # registry of proteins in set
                    all_protein_data[fig] = {'function' : row['function']}
                else:
                    skipped_entries += 1
            data_files.append({'file_name' : entry, 'contig_id' : contig_id, 'proteins' : proteins})

# check that our data is now nonempty, else there were no data files in directory
if len(data_files) == 0:
    raise Exception("expected at least one data file in %s to read from! got none." % args.directory)

# if output directory does not exist, create it
output_dir_path = os.path.join(cur_dir, 'output')
if os.path.exists(output_dir_path) and os.path.isfile(output_dir_path):
    raise Exception("[protein] output exists but is a file, expected output to be a directory!")
elif not os.path.exists(output_dir_path):
    os.mkdir(output_dir_path)

# accumulate all proteins into a big list first
all_proteins = []
for data in data_files:
    only_proteins = data['proteins']
    all_proteins.append(only_proteins)

# calculate how many unique proteins exist in total (not ones unique to each genome but overall)
all_unique_proteins = set.union(*all_proteins)

# calculate the intersection of the sets of proteins, gives us all which are common
all_common_proteins = set.intersection(*all_proteins)

percentage_skipped = (skipped_entries / total_entries) * 100
print("[protein] total skipped entries: %d (%d %% of total)" % (skipped_entries, percentage_skipped))
print("[protein] total unique proteins: %d" % (len(all_unique_proteins)))
print("[protein] total common proteins: %d" % (len(all_common_proteins)))

# calculate and present the proteins which are unique to each genome, and to which
unique_proteins = {}
for e_cur in data_files:
    cur_proteins = e_cur['proteins']
    all_except_cur = [e['proteins'] for e in data_files if e != e_cur]
    cur_unique_proteins = cur_proteins.difference(*all_except_cur)
    cur_contig_id = e_cur['contig_id']
    unique_proteins[e_cur['file_name']] = (contig_id, cur_unique_proteins)

for (file_name, (contig_id, proteins)) in unique_proteins.items():
    print("[protein] file %s has %d unique proteins" % (file_name, len(proteins)))

# format and output the data

# first all genes common to all the datasets passed in
common_file_path = os.path.join(cur_dir, 'output/common_proteins.csv')
with open(common_file_path, 'w') as csvfile:
    print("[protein] wrote common proteins to: %s", common_file_path)
    writer = csv.DictWriter(csvfile, fieldnames=['figfam', 'function'])
    writer.writeheader()
    for fig in all_common_proteins:
        cur_fig_data = all_protein_data[fig]
        writer.writerow(
            {
                'figfam' : fig,
                'function' : cur_fig_data['function']
            }
        )

# then a sheet with all that are unique
unique_file_path = os.path.join(cur_dir, 'output/unique_proteins.csv')
with open(unique_file_path, 'w') as csvfile:
    print("[protein] wrote unique proteins to: %s", unique_file_path)
    writer = csv.DictWriter(csvfile, fieldnames=['figfam'])
    writer = csv.DictWriter(csvfile, fieldnames=['file_name', 'contig_id', 'figfam', 'function'])
    writer.writeheader()
    for (file_name, (contig_id, proteins)) in unique_proteins.items():
        for fig in proteins:
            cur_fig_data = all_protein_data[fig]
            writer.writerow(
                {
                    'file_name' : file_name,
                    'contig_id' : contig_id,
                    'figfam' : fig,
                    'function' : cur_fig_data['function']
                }
            )
