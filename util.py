import os
import csv

# reused functions

def collect_job_ids_from_csv(job_csv_file_path):
    job_ids = []
    with open(job_csv_file_path, 'r') as csvfile:
        reader = csv.DictReader(csvfile) # fieldnames=['job_id', 'file_name', 'success']
        for row in reader:
            if row['success'] == 'True':
                job_ids.append(row['job_id'])
    return job_ids

def create_output_directory_if_not_exists(cwd):
    output_dir_path = os.path.join(cwd, 'output')
    if os.path.exists(output_dir_path) and os.path.isfile(output_dir_path):
        raise Exception("output exists but is a file, expected output to be a directory!")
    elif not os.path.exists(output_dir_path):
        os.mkdir(output_dir_path)

def get_files_in_folder_with_ext(extension):
    paths = []
    for entry in os.listdir():
        name, ext = os.path.splitext(entry)
        if os.path.isfile(entry) and ext == extension:
            paths.append(entry)
    return paths

