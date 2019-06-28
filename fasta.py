import os
import csv
import datetime
import subprocess
import argparse
import shutil
import re

path_to_submit_fasta_cmd = shutil.which("svr_submit_RAST_job")
submit_fasta_job_cmd = " --domain Bacteria --user %s --passwd %s --fasta %s"
absolute_cmd_path = path_to_submit_fasta_cmd + submit_fasta_job_cmd
fasta_job_output_regex = re.compile(r"'(\d+)'")

parser = argparse.ArgumentParser(description='Batch upload a directory of fasta files.')
parser.add_argument(
    '--username', metavar='username', type=str,
    help='your login username'
)
parser.add_argument(
    '--password', metavar='password', type=str,
    help='your login password'
)
parser.add_argument(
    'directory', type=str, default=os.getcwd(), nargs="?",
    help='the directory with the fasta (.fa) files in it to upload'
)

def write_job_id_to_file(job_id, file_name, success):
    output_filename = 'output/submitted_jobs.csv'
    if not os.path.exists(output_filename):
        print("[batch] writing id: %s to new file: %s" % (job_id, output_filename))
        with open(output_filename, 'w') as csvfile:
            our_writer = csv.writer(csvfile)
            our_writer.writerow(['job_id', 'file_name', 'success'])
            our_writer.writerow([job_id, file_name, success])
    else:
        print("[batch] writing id: %s to existing file: %s" % (job_id, output_filename))
        with open(output_filename, 'a') as csvfile:
            our_writer = csv.writer(csvfile)
            our_writer.writerow([job_id, file_name, success])

def submit_fasta_files_in_dir(username, password, directory):
    os.chdir(args.directory)
    for entry in os.listdir():
        if os.path.isfile(entry) and entry.endswith(".fa"):
            try:
                print("[batch] trying to submit: %s at %s" % (entry, datetime.datetime.now()))
                output = subprocess.getoutput(absolute_cmd_path % (args.username, args.password, entry))
                our_match = fasta_job_output_regex.search(output)
                submitted_job_id = our_match.group(1)
                write_job_id_to_file(submitted_job_id, entry, success = True)
            except:
                print("[batch] failed to submit: %s at %s" % (entry, datetime.datetime.now()))
                write_job_id_to_file(-1, entry, success = False)

args = parser.parse_args()
submit_fasta_files_in_dir(args.username, args.password, args.directory)
