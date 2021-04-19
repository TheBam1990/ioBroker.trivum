![Logo](admin/omron-fins.png)
# ioBroker.omron-fins

[![NPM version](http://img.shields.io/npm/v/iobroker.omron-fins.svg)](https://www.npmjs.com/package/iobroker.omron-fins)
[![Downloads](https://img.shields.io/npm/dm/iobroker.omron-fins.svg)](https://www.npmjs.com/package/iobroker.omron-fins)
![Number of Installations (latest)](http://iobroker.live/badges/omron-fins-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/omron-fins-stable.svg)
[![Dependency Status](https://img.shields.io/david/thebam1990/iobroker.omron-fins.svg)](https://david-dm.org/thebam1990/iobroker.omron-fins)
[![Known Vulnerabilities](https://snyk.io/test/github/thebam1990/ioBroker.omron-fins/badge.svg)](https://snyk.io/test/github/thebam1990/ioBroker.omron-fins)

[![NPM](https://nodei.co/npm/iobroker.omron-fins.png?downloads=true)](https://nodei.co/npm/iobroker.omron-fins/)

**Tests:** ![Test and Release](https://github.com/thebam1990/ioBroker.omron-fins/workflows/Test%20and%20Release/badge.svg)

## trivum adapter for ioBroker
Trivum Multiroom System


## Benutzer anleitung (deutsch)

Im Tab Haupteinstellungen die IP Adresse des Gerätes eingeben. 
Der Adapter sucht automatisch dann nach den verfügbaren Zonen und schreibt diese mit den dazugehörigen Objekten in die Objektliste.

Es werden erstellt als Übergreifende Variablen (Global):

-Alles ausschalten

-Aktive Zonen (wie viele Zonen derzeit an sind)

Dann unter den einzelnen Zonen die jeweiligen steuer elemente:

-Muten (Stumm schalten und wieder aktiv schalten)

-Defoult-Stream (Einschaltend er Zone mit dem Standard webstream)

-Defoult-Tuner (Einschaltend er Zone mit dem Standard Tuner)

-Volume (Anzeigen der Lautstärker und verändern von dieser)

-Zone-Off (Ausschalten der Zone)

-Status der Zone (Zeigt an ob Zone an oder aus ist)



## Changelog
<!--
 Placeholder for the next version (at the beginning of the line):
 ### __WORK IN PROGRESS__ ( - falls nicht benötigt löschen sonst klammern entfernen und nach dem - dein text schreiben )
-->

### 0.0.1
* (Thebam) initial release
Erste version zum Steuern ihre Trivum Multiroom Systems

## License
MIT License

Copyright (c) 2021 thebam 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.