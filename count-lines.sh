#!/bin/bash

# Count lines of code in the application
cloc . --exclude-dir=node_modules,.next,.git --exclude-lang=JSON,Markdown,SVG,XML,Text
