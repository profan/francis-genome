import os
import csv
import argparse

# our utils
import util

# the only purpose of this file is to collate the various data into a unified format
#  for feeding into our javascript visualization, so we can depend on the format we specify here
#  instead of a spread of various data files whose format may change.

parser = argparse.ArgumentParser(description='Collate protein data for use in js visualization.')
parser.add_argument(
    '--all-proteins', type=str, required=True,
    help='the csv file with all proteins in it.'
)

parser.add_argument(
    '--unique-proteins', type=str, required=True,
    help='the csv file with the unique proteins in it.'
)

parser.add_argument(
    '--common-proteins', type=str, required=True,
    help='the csv file with the common proteins in it.'
)

parser.add_argument(
    '--subsystems-dir', type=str, required=True,
    help='the directory with the files containing the subsystem data in it.'
)

args = parser.parse_args()
