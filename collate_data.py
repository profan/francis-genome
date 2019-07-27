import os
import csv
import json
import argparse

# our utils
import util

# the only purpose of this file is to collate the various data into a unified format
#  for feeding into our javascript visualization, so we can depend on the format we specify here
#  instead of a spread of various data files whose format may change.

parser = argparse.ArgumentParser(description='Collate protein data for use in js visualization.')
parser.add_argument(
    '--all-proteins', metavar='all_proteins', type=str, required=True,
    help='the csv file with all proteins in it.'
)

parser.add_argument(
    '--unique-proteins', metavar='unique_proteins', type=str, required=True,
    help='the csv file with the unique proteins in it.'
)

parser.add_argument(
    '--common-proteins', metavar='common_proteins', type=str, required=True,
    help='the csv file with the common proteins in it.'
)

parser.add_argument(
    '--subsystems-dir', metavar='subsystems_dir', type=str, required=True,
    help='the directory with the files containing the subsystem data in it.'
)

args = parser.parse_args()

protein_data = {}

all_proteins_file = args.all_proteins
unique_proteins_file = args.unique_proteins
common_proteins_file = args.common_proteins
subsystems_dir = args.subsystems_dir
