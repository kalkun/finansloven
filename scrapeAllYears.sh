#!/bin/sh

for i in `seq 2003 2017`; do ./scraper.py -o "public/data/finanslov_y$i.tsv" -d "\t" -y $i; done;
