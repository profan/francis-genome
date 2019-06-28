import re
import os
import csv

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

rgx = re.compile(r'\[batch\] writing id\: (\d+) to new file\: (.*\.fa)')
rgx_recov = re.compile(r'\[batch\] failed to submit\: (.*\.fa)')

count = 0
with open('saved_shit', 'r') as shitfile:
    for line in shitfile:
        try:
            m = rgx.search(line)
            job_id = m.group(1)
            file_name = m.group(2)
            print("[saviour] recovered id %s for job %s" % (job_id, file_name))
            write_job_id_to_file(job_id, file_name, True)
            count += 1
        except:
            try:
                m = rgx_recov.search(line)
                file_name = m.group(1)
                print("[saviour] recovered failed job: %s" % (file_name))
                write_job_id_to_file(-1, file_name, False)
            except:
                pass
print("[saviour] wrote %d to submitted jobs" % count)
