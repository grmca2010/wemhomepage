console.log('@@@@@@@@@@@@@@@@@@@@ csvToJSOn file loaded @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@2');

var csvToJSONConverter = {};
 csvToJSONConverter.txtFileUpload = document.getElementById('txtFileUpload');

csvToJSONConverter.csvJSON = function(csv, fileName) {
    //console.log(csv);
    console.log('Processing Started at Time: ' + new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds());

    var lines = csv.split("\n");

    if (lines.length == 1) {

        document.getElementById('reprocessData').innerHTML = lines[0];


        lines = document.getElementById('reprocessData').innerHTML.split('\n');

    }

    var result = [];

    var headers = lines[0].split(",");

    var obj;
    var currentline;
    var getProperty;
    var getValue;
    var j;
    var i;

    for (i = 1; i < lines.length; i++) {

        obj = {};
        currentline = lines[i].split(",");

        for (j = 0; j < headers.length; j++) {
            getProperty = headers[j];
            getValue = currentline[j];
            if (getProperty != undefined && getValue != undefined) {
                //document.getElementById('processedJSON').rows = 	document.getElementById('processedJSON').rows + j;
                obj[getProperty.replace(/"/g, "")] = getValue.replace(/"/g, "");
            }
        }

        result.push(obj);

    }

    //return result; //JavaScript object
    return JSON.stringify(result); //JSON

}


csvToJSONConverter.selectFile = function(evt) {
    evt.target.value = null;

}

csvToJSONConverter.upload = function(evt) {
    $('#waitText').html('<h2>Loading.........</h2>');
    $('#processedJSON').val('');

    var data = null;
    var file = evt.target.files[0];

    var fileName = file.fileName != undefined ? file.fileName.split('.')[0] : file.name.split('.')[0];
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event) {
        var csvData = event.target.result;
        console.log('@@@@@@@@@@@@@@@@@upload@@@@@@@@@@@@@@@22');
        var getJSONString;
        getJSONString = csvToJSONConverter.csvJSON(csvData, fileName);
        document.getElementById('processedJSON').value = getJSONString;
        document.getElementById('storeJSON').value = getJSONString;
        console.log('Processing End at Time: ' + new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds());
        $('#waitText').html('');
    };
    reader.onerror = function() {
        alert('Unable to read ' + file.fileName);
    };




}

if(csvToJSONConverter.txtFileUpload.addEventListener){
	csvToJSONConverter.txtFileUpload.addEventListener('change', csvToJSONConverter.upload, false);
	csvToJSONConverter.txtFileUpload.addEventListener('click', csvToJSONConverter.selectFile, false);		
}else if(csvToJSONConverter.txtFileUpload.attachEvent){
    csvToJSONConverter.txtFileUpload.attachEvent('onchange', csvToJSONConverter.upload);
	csvToJSONConverter.txtFileUpload.attachEvent('onclick', csvToJSONConverter.selectFile);			
}