import os
import csv
import requests
import datetime
import argparse
import webbrowser
from bs4 import BeautifulSoup

base_url = "https://rast.nmpdr.org/"
login_url = "https://rast.nmpdr.org/rast.cgi"
download_url = "https://rast.nmpdr.org/download.cgi"
job_page_url = "https://rast.nmpdr.org/rast.cgi?page=JobDetails&job=%d"

login_headers = {
    'User-Agent': 'Mozilla/5.0'
}

def login_to_rast(username, password):

    login_payload = {
        'login' : username,
        'password' : password,
        'action' : 'perform_login'
    }

    s = requests.Session()
    p = s.post(login_url, data=login_payload)

    page_has_login = (p.text.find("Login") != -1)
    page_has_pass = (p.text.find("Password") != - 1)
    page_contains_login_and_password = page_has_login and page_has_pass

    if page_contains_login_and_password:
        print("[fetch_subsystems] login failed, exiting!")
        exit()
    else:
        print("[fetch_subsystems] login successful at [%s]" % datetime.datetime.now())

    return s

def extract_genome_url_for_job_id(session, job_id):

    p = session.get(job_page_url % job_id)
    soup = BeautifulSoup(p.content, "lxml")
    e = soup.find('a', string="Browse annotated genome in SEED Viewer")
    return base_url + "/" + e['href']

def extract_subsystem_data(session, url):
    pass

def collect_job_ids_from_csv(job_csv_file_path):
    job_ids = []
    with open(job_csv_file_path, 'r') as csvfile:
        reader = csv.DictReader(csvfile) # fieldnames=['job_id', 'file_name', 'success']
        for row in reader:
            if row['success'] == 'True':
                job_ids.append(row['job_id'])

parser = argparse.ArgumentParser(description='Fetches all feature subsystem data for a given job.')
parser.add_argument(
    '--username', metavar='username', type=str,
    help='your login username'
)
parser.add_argument(
    '--password', metavar='password', type=str,
    help='your login password'
)
parser.add_argument(
    '--filename', metavar='filename', type=str,
    help='csv with submitted jobs'
)

args = parser.parse_args()
session = login_to_rast(args.username, args.password)
all_job_ids = collect_job_ids_from_csv(args.filename)
print("[fetch_subsystems] got %d job ids to fetch" % len(all_job_ids))

for i, job_id in all_job_ids.enumerate():
    genome_url = extract_genome_url_for_job_id(session, test_job_id)
    webbrowser.open_new_tab(genome_url)
    input("[fetch_subsystems] press enter to load %d of %d" % (i + 1, len(all_job_ids)))
