import os
import csv
import argparse

# our utils
import util

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

# first collect all proteins associated with each file
all_genome_ids = {}
all_protein_data = {}
skipped_entries_with_figs = 0
skipped_entries = 0
total_entries = 0

os.chdir(args.directory)
csv_files = util.get_files_in_folder_with_ext(".csv")


data_files = []
for entry in csv_files:
    with open(entry) as csvfile:

        def has_valid_figfam_id(p):
            return 'figfam' in p and not p['figfam'].isspace() and not p['figfam'] == ""

        def is_hypothetical_protein(p):
            return 'hypothetical' in p['function']

        reader = csv.DictReader(csvfile)
        proteins = set() # to automatically eliminate duplicates
        have_fetched_contig_id = False
        contig_id = -1

        for row in reader:

            # keep track of total number of entries
            total_entries += 1
            if not have_fetched_contig_id:
                have_fetched_contig_id = True
                contig_id = get_leading_id(row['contig_id'])

            # we only care about the row if it has a figfam entry, and it is nonempty
            if has_valid_figfam_id(row):

                if is_hypothetical_protein(row):
                    skipped_entries_with_figs +=1
                    continue

                fig = row['figfam']
                proteins.add(fig)
                # registry of proteins in set
                if fig in all_protein_data:
                    all_protein_data[fig]['feature_ids'].append(row['feature_id'])
                    all_protein_data[fig]['contig_ids'].append(contig_id)
                else:
                    all_protein_data[fig] = {
                        'function' : row['function'],
                        'feature_ids' : [row['feature_id']],
                        'contig_ids' : [contig_id]
                    }
            else:
                skipped_entries += 1

        if contig_id in all_genome_ids:
            prev_file_name = all_genome_ids[contig_id]['file_name']
            raise Exception("found duplicate id: %s in %s, previously encountered in file: %s" % (contig_id, entry, prev_file_name))
        else:
            all_genome_ids[contig_id] = {'file_name' : entry}
            data_files.append({'file_name' : entry, 'contig_id' : contig_id, 'proteins' : proteins})

# check that our data is now nonempty, else there were no data files in directory
if len(data_files) == 0:
    raise Exception("expected at least one data file in %s to read from! got none." % args.directory)

# if output directory does not exist, create it
util.create_output_directory_if_not_exists(cur_dir)

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
percentage_skipped_with_figs = (skipped_entries_with_figs / total_entries) * 100
total_entries_skipped = skipped_entries + skipped_entries_with_figs
total_percentage_skipped = percentage_skipped_with_figs + percentage_skipped
print("[protein] skipped entries (no figs): %d (%d %% of total)" % (skipped_entries, percentage_skipped))
print("[protein] skipped entries (hypotheticals with figs): %d (%d %% of total)" % (skipped_entries_with_figs, percentage_skipped_with_figs))
print("[protein] total skipped entries: %d (%d %% of total)" % (total_entries_skipped, total_percentage_skipped))
print("[protein] total unique proteins: %d" % (len(all_unique_proteins)))
print("[protein] total common proteins: %d" % (len(all_common_proteins)))

# calculate and present the proteins which are unique to each genome, and to which
unique_proteins = {}
for e_cur in data_files:
    cur_proteins = e_cur['proteins']
    all_except_cur = [e['proteins'] for e in data_files if e != e_cur]
    cur_unique_proteins = cur_proteins.difference(*all_except_cur)
    cur_contig_id = e_cur['contig_id']
    unique_proteins[e_cur['file_name']] = (cur_contig_id, cur_unique_proteins)

for (file_name, (contig_id, proteins)) in unique_proteins.items():
    print("[protein] file %s (id: %s) has %d unique proteins" % (file_name, contig_id, len(proteins)))

# format and output the data

# first all genes common to all the datasets passed in
common_file_path = os.path.join(cur_dir, 'output/common_proteins.csv')
with open(common_file_path, 'w') as csvfile:
    print("[protein] wrote common proteins to: %s" % common_file_path)
    writer = csv.DictWriter(csvfile, fieldnames=['figfam', 'function'], dialect="excel")
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
    print("[protein] wrote unique proteins to: %s" % unique_file_path)
    writer = csv.DictWriter(csvfile, fieldnames=['file_name', 'contig_id', 'figfam', 'function'], dialect="excel")
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

# number of nonempty sets
nonempty_unique_protein_sets = 0
for (file_name, (contig_id, proteins)) in unique_proteins.items():
    if len(proteins) > 0: nonempty_unique_protein_sets += 1

# write in column form
unique_column_file_path = os.path.join(cur_dir, 'output/unique_column_proteins.csv')
with open(unique_column_file_path, 'w') as csvfile:
    print("[protein] wrote unique proteins to: %s" % unique_column_file_path)
    writer = csv.writer(csvfile, dialect="excel")
    writer.writerow(['file_name', 'contig_id', 'figfam', 'function', ''] * nonempty_unique_protein_sets)
    data_to_write = []
    cur_column = 0
    for (file_name, (contig_id, proteins)) in unique_proteins.items():
        cur_row = 0
        # nothing to write
        if len(proteins) == 0: continue
        for fig in proteins:
            if cur_row >= len(data_to_write): data_to_write.append([])
            cur_fig_data = all_protein_data[fig]
            cur_row_len = len(data_to_write[cur_row])
            if cur_row_len != cur_column * 5:
                needed_padding = (cur_column * 5) - cur_row_len
                data_to_write[cur_row] += [''] * needed_padding
            data_to_write[cur_row] += [file_name, contig_id, fig, cur_fig_data['function'], '']
            cur_row += 1
        cur_column += 1
    # finally write the data
    for row in data_to_write:
        writer.writerow(row)

# output a sheet with the stats also shown in console
stats_file_path = os.path.join(cur_dir, 'output/output_stats.csv')
with open(stats_file_path, 'w') as csvfile:
    print("[protein] wrote output stats to: %s" % stats_file_path)
    writer = csv.writer(csvfile, dialect="excel")
    writer.writerow(['Total Different Proteins', len(all_unique_proteins)])
    writer.writerow(['Total Common Proteins', len(all_common_proteins)])
    writer.writerow(['Total % of Discarded Proteins', percentage_skipped])
    writer.writerow(['Filename', 'Genome', 'Unique Proteins'])
    for (file_name, (contig_id, proteins)) in unique_proteins.items():
        writer.writerow([file_name, contig_id, len(proteins)])

# also output _all proteins_ so we can do this same analysis in the browser (or well, most of it)
all_file_path = os.path.join(cur_dir, 'output/all_proteins.csv')
with open(all_file_path, 'w') as csvfile:
    print("[protein] wrote all proteins to: %s (%d proteins)" % (all_file_path, len(all_protein_data)))
    writer = csv.DictWriter(csvfile, dialect="excel", fieldnames=['figfam', 'function', 'feature_ids', 'contig_ids'])
    writer.writeheader()
    for fig in all_protein_data:
        cur_fig_data = all_protein_data[fig]
        cur_feature_ids = ';'.join(cur_fig_data['feature_ids'])
        cur_contig_ids = ';'.join(cur_fig_data['contig_ids'])
        writer.writerow({
            'figfam' : fig,
            'function' : cur_fig_data['function'],
            'feature_ids' : cur_feature_ids,
            'contig_ids' : cur_contig_ids
        })
