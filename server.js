// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');
const { response } = require('express');


let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

let app = express();
let port = 8000;

// open usenergy.sqlite3 database
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

app.use(express.static(public_dir)); // serve static files from 'public' directory


// GET request handler for home page '/' (redirect to /year/2018)
app.get('/', (req, res) => {
    res.redirect('/year/2018');
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    console.log(req.params.selected_year);
    fs.readFile(path.join(template_dir, 'year.html'), (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        if(req.params.selected_year < 1960 || req.params.selected_year > 2018){
            res.status(404).type('text/plain').send("Error: no data for year " + req.params.selected_year);
        }else{
            let sql = 'select * from Consumption inner join States on Consumption.state_abbreviation=States.state_abbreviation where year='+req.params.selected_year;
            //console.log(sql);
            db.all(sql,[],(err,rows) => {
                if (err){
                    throw err;
                    //console.log('could not establish connection to database');
                }
                else{
                    //turn the buffer into a string that can be parsed through
                    let html = template.toString();
                    //const sqldata = new Array();
                    let coal_count = 0;
                    let gas_count = 0;
                    let nuc_count = 0;
                    let pat_count = 0;
                    let ren_count = 0;
                    rows.forEach((row)=>{
                        coal_count += row.coal;
                        gas_count += row.natural_gas;
                        nuc_count += row.nuclear;
                        pat_count += row.petroleum;
                        ren_count += row.renewable;
                        total = coal_count + gas_count + nuc_count + pat_count + ren_count;

                        let tbl_row = "<tr><td>" + row.state_name + "</td>"
                        tbl_row += "<td>" + row.coal + "</td>";
                        tbl_row += "<td>" + row.natural_gas + "</td>";
                        tbl_row += "<td>" + row.nuclear + "</td>";
                        tbl_row += "<td>" + row.petroleum + "</td>";
                        tbl_row += "<td>" + row.renewable + "</td>"
                        tbl_row += "<td>" + total + "</td></tr>replace";

                        //console.log(tbl_row);

                        html = html.replace("replace", tbl_row);
                        //sqldata.push(row);
                    });
                    //console.log();
                    //console.log(sqldata.length);
                    let prev_year = req.params.selected_year - 1;
                    let next_year = (parseInt(req.params.selected_year) + 1);
                    html = html.replace("year", "year=" + req.params.selected_year);
                    html = html.replace("coal_count", "coal_count=" + coal_count);
                    html = html.replace("natural_gas_count", "natural_gas_count=" + gas_count);
                    html = html.replace("nuclear_count", "nuclear_count=" + nuc_count);
                    html = html.replace("petroleum_count", "petroleum_count=" + pat_count);
                    html = html.replace("renewable_count", "renewable_count=" + ren_count);
                    html = html.replace("insert_year", req.params.selected_year);
                    html = html.replace("prevbutton", "\"/year/" + prev_year + "\"");
                    html = html.replace("nextbutton", "\"/year/" + next_year + "\"");
                    html = html.replace("replace", "");
                    //console.log(html.toString());

                    var buf = Buffer.from(html, 'utf8');

                    res.status(200).type('html').send(buf);
                }
            });
        }       
        
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    console.log(req.params.selected_state);
    fs.readFile(path.join(template_dir, 'state.html'), (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        

        res.status(200).type('html').send(template); // <-- you may need to change this
    });
});

// GET request handler for '/energy/*'
app.get('/energy/:selected_energy_source', (req, res) => {
    console.log(req.params.selected_energy_source);
    fs.readFile(path.join(template_dir, 'energy.html'), (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        res.status(200).type('html').send(template); // <-- you may need to change this
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
