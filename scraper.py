#!/usr/bin/env python3

import requests
from bs4 import BeautifulSoup
import time
import csv
import sys

class Parser:
    def __init__(self):
        self.url = "http://www.oes-cs.dk/olapdatabase/finanslov/index.cgi"
        self.resetPostData()
        self.csvfile = "finanslov.dsv"
        # top level 1 then 2, 3, 4, 5....
        self.currentLevel = 1
        self.history = {}
        self.Queue = []
        self.data = []


        self.text = requests.post(self.url, data=self.postData).text
        self.soup = BeautifulSoup(self.text, "lxml")
        self.header = [
                "Paragraph", 
                "Hovedområde", 
                "Aktivitetsområde", 
                "Hovedkonto", 
                "Underkonto", 
                "Standardkonto", 
                "R 2015", 
                "B 2016", 
                "F 2017", 
                "BO 1 2018", 
                "BO 2 2019", 
                "BO 3 2020"
            ]
        self.dumpCSV(data=[self.header])
        
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
            time.sleep(.5)
            if len(self.data) > 50: 
                self.dumpCSV()
                self.data = []
        if len(self.data):
            self.dumpCSV()
            self.data = []
        
    def dumpCSV(self, csvfile=None, data=None):
        csvfile = csvfile or self.csvfile
        data = data or self.data
        with open(csvfile, "a+") as f:
            writer = csv.writer(f, delimiter=";")
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
                # at the bottom or at a leaf:
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
                    pgf,
                    homrade,
                    aomrade,
                    hkonto,
                    ukonto,
                    stdkonto,
                    float(row[1].text.strip().replace(".", "").replace(",", ".")),
                    float(row[2].text.strip().replace(".", "").replace(",", ".")),
                    float(row[3].text.strip().replace(".", "").replace(",", ".")),
                    float(row[4].text.strip().replace(".", "").replace(",", ".")),
                    float(row[5].text.strip().replace(".", "").replace(",", ".")),
                    float(row[6].text.strip().replace(".", "").replace(",", ".")),

                ])
                print("-" * 80)
                print("-" * 5 + " " + str(self.data[-1]) + " " + "-" * 5)

    def resetPostData(self):
        self.postData = { 
            "funk" : "STANDARDRAP", 
            "dwidth" : "1920", 
            "subwindow" : "1",
            "struktur" : "PGF HOMRADE AOMRADE HKONTO UKONTO STDKTO"
        }

    def drillDown(self, selectedVal):
        curvar = self.soup.find("input", {"name" : "curvar"})['value']
        keyLength = selectedVal.index(' ')
        self.postData['curvar'] = selectedVal[0:keyLength]
        self.postData['up' + curvar] = selectedVal
        self.postData['funk'] = "DRILLDOWN"
        self.postData['curniv'] = self.currentLevel
        self.text = requests.post(self.url, data=self.postData).text

    def parseIds(self, ids, curniv=None):
        if len(ids) == 2:
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
            raise ValueError("Ids are not a parsable length")



if __name__ == "__main__":
    parser = Parser()
