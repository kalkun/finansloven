console.log('Loading a web page');
var page = require('webpage').create();
var url = 'http://www.oes-cs.dk/olapdatabase/finanslov/index.cgi';

page.onConsoleMessage = function(msg) {
    console.log(msg);
}


postBody = "funk=STANDARDRAP&dwidth=1920&subwindow=1"
page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
    page.open(url, 'POST', postBody, function(status) {
        var rows = page.evaluate(function(){
            function parseIds(rowId) {
                switch(rowId.length) {
                    case 2:
                        return { "lvl0" : rowId } 
                    case 3:
                        return { 
                            "lvl0" : rowId.slice(0,2),
                            "lvl1" : rowId.slice(2,3)
                        }
                    case 4:
                        return {
                            "lvl0" : rowId.slice(0,2),
                            "lvl1" : rowId.slice(2,3),
                            "lvl2" : rowId.slice(3,4)
                        }
                    case 6:
                        return {
                            "lvl0" : rowId.slice(0,2),
                            "lvl1" : rowId.slice(2,3),
                            "lvl2" : rowId.slice(3,4),
                            "lvl3" : rowId.slice(4,6)
                        }
                    case 8:
                        return {
                            "lvl0" : rowId.slice(0,2),
                            "lvl1" : rowId.slice(2,3),
                            "lvl2" : rowId.slice(3,4),
                            "lvl3" : rowId.slice(4,6),
                            "lvl4" : rowId.slice(6,8)
                        }
                    default:
                        return null;
                }
            }
            function checkIfChildren(el) {
                // if (el.children[0]) {
                var descendantsLink = el.children[0].href.split(":")[1];
                try {
                    console.log("------- ", descendantsLink, " ----------", eval);            
                    eval(descendantsLink);
                } catch(e) {
                    console.log("found a leaf...");
                }
            }
            var table = document.querySelectorAll("table");
            table = table[table.length -1];
            var rows = table.children[0].children;
            try {
                for (var i = 0; i < rows.length; i++) {
                    if (rows[i] && rows[i].className == "tabcelle") {
                        var columns = rows[i].children;
                        var cellContent = columns[0].innerText.split(" ")
                        var rowId = cellContent[0]
                        console.log(parseIds(cellContent[0]).lvl0);
                        var rowName = cellContent.slice(1).join(" ");
                        if (!history.hasOwnProperty(rowId)) {
                            history[rowId] = {
                                "name" : rowName
                            }
                            console.log("Found ", rowName, "with id=", rowId);
                        }
                        for (var j = 0; j < columns.length; j++) {
                            if (j == 0) {
                                checkIfChildren(columns[0]);
                            }
                        }
                    }
                }
            } catch(e) {
                console.log(e);
            }

        });
        phantom.exit()
    })
})
