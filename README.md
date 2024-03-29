francis-genome
---------------

## tools

# fasta_submit_bacteria.py
Batch uploads all the `.fa` files in a directory you provide to RAST, or the current working directory if none is provided, will write all job ids and the file with which a given job was related to to a file in an `output` directory relative to the current working directory. (this tool may be slightly useless, given RASTtk's existence)

# proteins.py
Given a set of `.csv` files of classified genome data from RAST outputs two spreadsheets, one with all the proteins common to all passed genomes, one with all proteins that occur only in one genome, ie. given the genomes (A, B, C, D), if a protein occurs only in A, it is marked as unique.

Only proteins which have a figfam classification are included in the analysis.

* Unique proteins are output in `output/unique_proteins.csv`.
* Common proteins are output in `output/common_proteins.csv`.

The script reads all `.csv` files from the current working directory for the analysis if no directory is passed.

## requirements
* Python 3.6+
