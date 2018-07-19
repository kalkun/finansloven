#!/usr/bin/env python3
"""
    Execute from the commandline:

    `./scraper.py -h`

    default output file is `finanslov.dsv`
"""
import sys
import time
import math
import csv
import argparse
import requests
from bs4 import BeautifulSoup

class Scraper:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

        self.url = "http://www.oes-cs.dk/olapdatabase/finanslov/index.cgi"
        self.reqheaders = {
            "Referer": "http://www.oes-cs.dk/olapdatabase/finanslov/index.cgi",
        }
        self.resetPostData()
        self.csvfile = getattr(self, "output", "finanslov.dsv")
        # top level 1 then 2, 3, 4, 5....
        self.currentLevel = 1
        self.history = {}
        self.Queue = []
        self.data = []

        self.text = requests.post(self.url, data=self.postData, headers=self.reqheaders).text
        self.soup = BeautifulSoup(self.text, "lxml")
        hdr = self.soup.find_all("tr", class_="tabhdr")[1].find_all("th")
        [ x.find("br").replaceWith(" ") for x in hdr ]
        self.header = [
                "ID",
                "Paragraf",
                "Hovedområde",
                "Aktivitetsområde",
                "Hovedkonto",
                "Underkonto",
                "Standardkonto"
            ] + [ x.text.strip() for x in hdr ]

        self.flushCSV(data=[self.header])

        self.findDrillables()
        while self.Queue:
            topic = self.Queue.pop()
            if topic[1] in self.history:
                continue
            self.history[topic[1]] = topic[2]
            self.parseIds(topic[1])
            self.drillDown(topic[0])

            self.findDrillables(
                BeautifulSoup(self.text, "html.parser")
            )
            time.sleep(0.5)
            if len(self.data) > getattr(self, "interval", 50):
                self.flushCSV()
                self.data = []
        # all done, if anything in self.data
        # then flush it
        if len(self.data):
            self.flushCSV()
            self.data = []

    def flushCSV(self, csvfile=None, data=None):
        csvfile = csvfile or self.csvfile
        data = data or self.data
        with open(csvfile, "a+") as f:
            writer = csv.writer(f, delimiter=getattr(self, "delimiter", ";"))
            for row in data:
                writer.writerow(row)

    def findDrillables(self, soup=None):
        soup = soup or self.soup
        self.mainTable = soup.find_all(class_="tabcelle")
        for row in self.mainTable:
            try:
                val = row.find("a")['href']
                href = val.split(":")[1].split("'")[1]
                ID = val.split("'")[1].split(" ")[0]
                name = " ".join(val.split("'")[1].split(" ")[9:])
                if not ID in self.history:
                    self.Queue.append([
                        href,
                        ID,
                        name
                    ])

            except TypeError:
                # at the bottom / at a leaf:
                properlyClosed = BeautifulSoup(str(row), "lxml")
                row = properlyClosed.find(class_="tabcelle").find_all("td")
                pgf = self.history[self.postData["PGF"]]
                homrade = self.history[self.postData["HOMRADE"]]
                aomrade = self.history[self.postData["AOMRADE"]]
                hkonto = self.history[self.postData["HKONTO"]]
                ukonto = self.history[self.postData["UKONTO"]]
                stdkonto = " ".join(row[0].text.strip().split(" ")[1:])
                """
                    can change this from hard code appending to
                    list to on user command build a csv, json or other...
                """
                self.data.append([
                    self.postData["UKONTO"] + row[0].text.strip().split(" ")[0], # the ID string reconstructed
                    pgf,
                    homrade,
                    aomrade,
                    hkonto,
                    ukonto,
                    stdkonto
                    ] + [ x.text.strip().replace(".", "").replace(",", ".") for x in row[1:7] ]
                )

                self.printLatest(self.data[-1])

    def printLatest(self, line):
        print("-" * 80)
        for i in range(len(line)):
            print(
                self.header[i] + " " * (20 - len(self.header[i])) + line[i]
                if line[i] and line[i][0] != "-"
                else self.header[i] + " " * (19 - len(self.header[i])) + line[i]
            )

    def resetPostData(self):
        self.postData = {
            "funk"      : "STANDARDRAP",
            "dwidth"    : "1973",
            "qFINAR"    : getattr(self, "year", 2018),
            "kFINAR"    : getattr(self, "year", 2018),
            "rapniv"    : 1,
            "subwindow" : "0",
            "struktur"  : "PGF HOMRADE AOMRADE HKONTO UKONTO STDKTO"
        }

    def drillDown(self, selectedVal):
        curvar = self.soup.find("input", {"name" : "curvar"})['value']
        keyLength = selectedVal.index(' ')
        self.postData['curvar'] = selectedVal[0:keyLength]
        self.postData['up' + curvar] = selectedVal
        self.postData['funk'] = "DRILLDOWN"
        self.postData['curniv'] = self.currentLevel
        wait = 1
        while True:
            time.sleep(.1)
            try:
                self.text = requests.post(
                    self.url,
                    data=self.postData,
                    headers=self.reqheaders
                ).text
            except requests.exceptions.ConnectionError:
                print("Connection error, sleep for %s seconds" % wait)
                time.sleep(wait)
                wait *= 2
                continue
            break

    def parseIds(self, ids, curniv=None):
        if len(ids) == 2:
            # paragraf
            self.postData['PGF'] = ids
            self.currentLevel = curniv or 1
            return
        elif len(ids) == 3:
            # hovedområde
            self.postData['HOMRADE'] = ids
            self.parseIds(ids[:2], curniv or 2)
        elif len(ids) == 4:
            # aktivområde
            self.postData['AOMRADE'] = ids
            self.parseIds(ids[:3], curniv or 3)
        elif len(ids) == 6:
            # hovedkonto
            self.postData['HKONTO'] = ids
            curniv = curniv or 4
            self.parseIds(ids[:4], curniv or 4)
        elif len(ids) == 8:
            # underkonto
            self.postData['UKONTO'] = ids
            self.parseIds(ids[:6], 5)
        else:
            raise ValueError("Ids are not a parseable length")



################################################################################
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description = "Scraper for Finansministeriets finanslovsdatabase"
    )
    parser.add_argument(
        "-o",
        "--output",
        metavar = "FILE",
        help = "The output file to write the scraped information to (default: finanslov.dsv)",
        default ="finanslov.dsv"
    )
    parser.add_argument(
        "-y",
        "--year",
        metavar = "YYYY",
        help = "The financial year to request from the database (default: 2017)",
        default = "2017",
    )
    parser.add_argument(
        "-i",
        "--interval",
        help = "The interval frequency that the scraped rows will be written to file (default: 50)",
        type = int,
        default = 50
    )
    parser.add_argument(
        "-d",
        "--delimiter",
        help = "The delimiter to use for the output dsv (default: ';')",
        type = lambda x: x.encode().decode("unicode_escape"),
        default = ";"
    )
    args = vars(parser.parse_args())
    sc = Scraper(**args)
