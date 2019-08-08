import os
import json
import numpy
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import itertools

def set_similarity(a, b):
    a_size, b_size = len(a), len(b)
    c = a.intersection(b)
    if a_size >= b_size:
        return len(c) / a_size
    elif a_size < b_size:
        return len(c) / b_size

def generate_plot(similarity_map, x_labels, y_labels, plot_title, output_filename):

    fig, axes = plt.subplots(figsize=(24, 24))
    im = axes.imshow(similarity_map)
    axes.tick_params(axis='both', pad=10)

    # show color bar
    plt.colorbar(im)

    # set up ticks and labels
    axes.set_xticks(numpy.arange(len(x_labels)))
    axes.set_yticks(numpy.arange(len(y_labels)))
    axes.set_xticklabels(x_labels, fontsize=8)
    axes.set_yticklabels(y_labels, fontsize=8)
    axes.xaxis.set_label_position('top')
    axes.xaxis.tick_top()

    plt.setp(axes.get_xticklabels(), rotation=90)
    plt.setp(axes.get_yticklabels(), rotation=0)
    axes.set_title(plot_title)

    plt.savefig(output_filename)


with open('output/genomes.json', 'r') as f:

    genomes = {contig_id:set(data['proteins']) for (contig_id, data) in json.load(f).items()}
    similarity = {}

    for (contig_id, proteins) in genomes.items():
        for (other_id, other_proteins) in genomes.items():
            if contig_id not in similarity:
                similarity[contig_id] = {other_id : set_similarity(proteins, other_proteins)}
            else:
                similarity[contig_id][other_id] = set_similarity(proteins, other_proteins)

    # now the plotting...
    genome_labels = [contig_id for contig_id in similarity]
    genome_labels.sort()

    similarity_map = [[similarity[x][y] for y in genome_labels] for x in genome_labels]

    generate_plot(
        similarity_map,
        x_labels = genome_labels,
        y_labels = genome_labels,
        plot_title="Pairwise Sample Similarity",
        output_filename="similarity_order_by_genome.png"
    )
