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

let states = ['AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI',
                 'IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN',
                 'MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH',
                 'OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA',
                 'WI','WV','WY'];
let sources = ['Coal', 'Natural_gas', 'Nuclear', 'Petroleum', 'Renewable'];

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
                    //html contains string of year.html contents
                    let html = template.toString();

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

                        //HTML table additions to template
                        let tbl_row = "<tr><td>" + row.state_name + "</td>"
                        tbl_row += "<td>" + row.coal + "</td>";
                        tbl_row += "<td>" + row.natural_gas + "</td>";
                        tbl_row += "<td>" + row.nuclear + "</td>";
                        tbl_row += "<td>" + row.petroleum + "</td>";
                        tbl_row += "<td>" + row.renewable + "</td>"
                        tbl_row += "<td>" + total + "</td></tr>replace";

                        html = html.replace("replace", tbl_row);
                    });

                    //Replace statements to fill rest of template
                    let prev_year = req.params.selected_year - 1;
                    let next_year = (parseInt(req.params.selected_year) + 1);
                    if(prev_year == 1959) {
                        prev_year = 2018;
                    }else if(next_year == 2019){
                        next_year = 1960;
                    }
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
        
        //Error check for valid state request
        if(!states.includes(req.params.selected_state)){
            res.status(404).type('text/plain').send("Error: this state is invalid: " + req.params.selected_state);
        }
        else{
            //Query
            let sql = 'select * ' + 
                      'from Consumption ' + 
                      'inner join States on Consumption.state_abbreviation = States.state_abbreviation ' + 
                      'where Consumption.state_abbreviation = "' + req.params.selected_state + '" ' + 
                      'order by year desc';
            
            //Query request to database
            db.all(sql,[],(err,rows) => {
                if (err){
                    throw err;
                }
                else{
                    //html is the string containing state.html contents
                    let html = template.toString();
                    let year = '';
                    let state_name = '';
                    let coal_count = 0;
                    let gas_count = 0;
                    let nuc_count = 0;
                    let pat_count = 0;
                    let ren_count = 0;
                    let total = 0;
                    /*Query loop: accessing row obj = '.' then 'year','state_abbreviation','coal','natural_gas',
                                                               'petroleum','renewable','state_name'*/
                    rows.forEach((row)=>{
                        state_name = row.state_name;
                        year = row.year;
                        coal_count += row.coal;
                        gas_count += row.natural_gas;
                        nuc_count += row.nuclear;
                        pat_count += row.petroleum;
                        ren_count += row.renewable;
                        total = row.coal + row.natural_gas + row.nuclear + row.petroleum + row.renewable;

                        //HTML table additions to template
                        let tbl_row = "<tr><td>" + row.year + "</td>"
                        tbl_row += "<td>" + row.coal + "</td>";
                        tbl_row += "<td>" + row.natural_gas + "</td>";
                        tbl_row += "<td>" + row.nuclear + "</td>";
                        tbl_row += "<td>" + row.petroleum + "</td>";
                        tbl_row += "<td>" + row.renewable + "</td>"
                        tbl_row += "<td>" + total + "</td></tr>replace";

                        //!Important: html.replace returns a value, needs to be stored
                        html = html.replace("replace", tbl_row);
                    });

                    //Replace statements to fill rest of template
                    let state_indx = states.indexOf(req.params.selected_state);
                    let prev_state = states[state_indx - 1];
                    let next_state = states[state_indx + 1];

                    if ((state_indx - 1) < 0){
                        prev_state = states[50];
                        console.log("prev state" + prev_state);
                    }
                    else if((state_indx + 1) > 50){
                        next_state = states[0];
                        console.log("next state: " + next_state);
                    }

                    html = html.replace("coal_count", "coal_count=" + coal_count);
                    html = html.replace("natural_gas_count", "natural_gas_count=" + gas_count);
                    html = html.replace("nuclear_count", "nuclear_count=" + nuc_count);
                    html = html.replace("petroleum_count", "petroleum_count=" + pat_count);
                    html = html.replace("renewable_count", "renewable_count=" + ren_count);
                    html = html.replace("insert_state", state_name);
                    html = html.replace("insert_src", "\"/images/states/" + state_name + ".jpg\"");
                    html = html.replace("insert_alt", "\"" + state_name + "\"");
                    html = html.replace("prevbutton", "\"/state/" + prev_state + "\"");
                    html = html.replace("nextbutton", "\"/state/" + next_state + "\"");
                    html = html.replace("replace", "");

                    var buf = Buffer.from(html, 'utf8');
                    res.status(200).type('html').send(buf);
                }
            });
        }
    });
});

// GET request handler for '/energy/*'
app.get('/energy/:selected_energy_source', (req, res) => {
    console.log(req.params.selected_energy_source);
    fs.readFile(path.join(template_dir, 'energy.html'), (err, template) => {
        //Error check for valid energy source
        if(!sources.includes(req.params.selected_energy_source)){
            res.status(404).type('text/plain').send("Error: this source is invalid: " + req.params.selected_energy_source);
        }else{
            //Query statement
            let sql = 'select * from Consumption group by year, state_abbreviation';
            //Query request
            db.all(sql,[],(err,rows) => {
                if (err){
                    throw err;
                }
                else{
                    //html contains string of energy.html contents
                    let html = template.toString();

                    //Creating table headers
                    let tbl_head = '';
                    for (let i=0; i<states.length; i++){
                        tbl_head += "<th>"+states[i]+"</th>"
                    }
                    html = html.replace("heading", tbl_head);
                    
                    let coal_count = 0;
                    let gas_count = 0;
                    let nuc_count = 0;
                    let pat_count = 0;
                    let ren_count = 0;
                    let selected_source = req.params.selected_energy_source.toString();
                    let count = 0;
                    let tbl_row = '';
                    rows.forEach((row)=>{
                        state_name = row.state_name;
                        year = row.year;
                        coal_count += row.coal;
                        gas_count += row.natural_gas;
                        nuc_count += row.nuclear;
                        pat_count += row.petroleum;
                        ren_count += row.renewable;
                        total = coal_count + gas_count + nuc_count + pat_count + ren_count;

                        //HTML table additions to template
                        if (count == 0){
                            tbl_row += "<tr><td>" + row.year + "</td><td>" + row[selected_source.toLowerCase()] + "</td>";
                            count ++;
                        }
                        else if(count == 50) {
                            tbl_row += "<td>" + row[selected_source.toLowerCase()] + "</td></tr>"
                            count = 0;
                        }
                        else{
                            tbl_row += "<td>" + row[selected_source.toLowerCase()] + "</td>";
                            count++;
                        }  
                    });
                    html = html.replace("replace", tbl_row);

                    //Replace statements to fill rest of template
                    let source_idx = sources.indexOf(req.params.selected_energy_source);
                    let prev_source = sources[source_idx - 1];
                    let next_source = sources[source_idx + 1];
                    if ((source_idx - 1) < 0){
                        prev_source = sources[4];
                    }
                    else if((source_idx + 1) > 4){
                        next_source = sources[0];
                    }
                    html = html.replace("coal_count", "coal_count=" + coal_count);
                    html = html.replace("natural_gas_count", "natural_gas_count=" + gas_count);
                    html = html.replace("nuclear_count", "nuclear_count=" + nuc_count);
                    html = html.replace("petroleum_count", "petroleum_count=" + pat_count);
                    html = html.replace("renewable_count", "renewable_count=" + ren_count);
                    html = html.replace("energy_source", selected_source);
                    html = html.replace("prevbutton", "\"/energy/" + prev_source + "\"");
                    html = html.replace("nextbutton", "\"/energy/" + next_source + "\"");
                    
                    var buf = Buffer.from(html, 'utf8');
                    res.status(200).type('html').send(buf);
                }
            });
        }       
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
