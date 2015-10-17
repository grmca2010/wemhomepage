Attribute VB_Name = "createJSON"
Sub createJSON()
'@lastRow: get number of rows
'@numberOfColumns : get number of columns
'@headers :array which will store columns name
'json : stores json structure

    Dim lastRow As Integer
    Dim numberOfColumns As Integer
    Dim headers() As Variant
    Dim json As String

    numberOfColumns = Range("A1").Columns.End(xlToRight).Column
    'Redifined header with size
    ReDim headers(numberOfColumns - 1)


    'Loop through number of columns to store column header names in array headers
    For fromColumn = 1 To numberOfColumns
      headers(fromColumn - 1) = Cells(1, fromColumn).Value
    Next fromColumn


    With ActiveSheet
        'get total number of rows
        lastRow = .Cells(.Rows.Count, "A").End(xlUp).Row
    End With

' @sets the currentLine array to length equal to size of columns to store each row cell data respective to its columns
    Dim currentLine() As Variant
    ReDim currentLine(numberOfColumns - 1)

    json = "["

    Dim separator As String
    separator = ""

    'Start from second row to lastrow because we have already covered row one as headers
    For fromRow = 2 To lastRow
        'For each row get corresponding cell data respective to its column and push it into currentLine object
        For fromColumn = 1 To numberOfColumns
         'stores each cell data in row into currentLine array
          currentLine(fromColumn - 1) = Cells(fromRow, fromColumn).Value
   
    Next fromColumn
 
    'Start preparing JSON Structure
    json = json & "{"
 
    'sizeOfKeyValuePair means an object will have properties/keys the same as that of headers array elements
    Dim sizeOfKeyValuePair As Integer
 
    'Set the sizeOfKeyValuePair variable to same size as that of headers
    sizeOfKeyValuePair = UBound(headers)
 
    'storekeyValuePair array will have elements with format ex:- name:"xyz" in the form of key value pair
    Dim storekeyValuePair() As Variant
    ReDim storekeyValuePair(sizeOfKeyValuePair)
 
    For i = 0 To UBound(headers)
        'For each row store cells data(Value) corresponding to its columns(key)
        storekeyValuePair(i) = """" & headers(i) & """" & ":" & """" & currentLine(i) & """"
   
    Next i
  
  ' While parsing to each row , if any row has subsequent row next to it, add separator(",") at the end otherwise leave it blank
    If fromRow < lastRow Then
     separator = ","
    Else
     separator = ""
    End If
  
  'Creating structure of each row inform of object
    json = json & Join(storekeyValuePair, ",") & "}" & separator
 
    Next fromRow
    'End JSON structure in the form of array of objects
    json = json & "]"
    
    'Debug.Print json
    
    
    Dim n As Integer
    
    Dim fileName As String
    fileName = "c:\dummyJSON.json"

    n = FreeFile()
    Open fileName For Output As #n
    'Write the contents of json to file
    Print #n, json
    Close #n
    
 
  ' give complete path of json file with file name
  'Dim fileName As String
   'fileName = "c:\dummyJSON.json"
    ' copy the contents of json structure in the form of string to file
    'Open fileName For Output As #1
   'Write #1, json
  'Close #1
 
End Sub
