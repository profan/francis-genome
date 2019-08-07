import os
import json
import matplotlib

def set_similarity(a, b):
    a_size, b_size = len(a), len(b)
    c = a.intersection(b)
    if a_size >= b_size:
        return len(c) / a_size
    elif a_size < b_size:
        return len(c) / b_size

with open('output/genomes.json', 'r') as f:

    genomes = {contig_id:set(data['proteins']) for (contig_id, data) in json.load(f).items()}
    similarity = {}

    for (contig_id, proteins) in genomes.items():
        for (other_id, other_proteins) in genomes.items():
            if contig_id != other_id:
                if contig_id not in similarity:
                    similarity[contig_id] = {other_id : set_similarity(proteins, other_proteins)}
                else:
                    similarity[contig_id][other_id] = set_similarity(proteins, other_proteins)
