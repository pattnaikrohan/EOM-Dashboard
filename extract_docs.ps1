$word = New-Object -ComObject Word.Application
$word.Visible = $false

$doc = $word.Documents.Open('D:\EOM DASHBOARDS PROTO\EOM_Agent_v3.docx')
$doc.Content.Text | Out-File -Encoding utf8 'D:\EOM DASHBOARDS PROTO\EOM_Agent_v3.txt'
$doc.Close($false)

$doc = $word.Documents.Open('D:\EOM DASHBOARDS PROTO\AAW_Dashboard_Development_Brief.docx')
$doc.Content.Text | Out-File -Encoding utf8 'D:\EOM DASHBOARDS PROTO\AAW_Dashboard_Development_Brief.txt'
$doc.Close($false)

$doc = $word.Documents.Open('D:\EOM DASHBOARDS PROTO\EOM JD extract - Addtional Business Rules.docx')
$doc.Content.Text | Out-File -Encoding utf8 'D:\EOM DASHBOARDS PROTO\EOM_JD_extract.txt'
$doc.Close($false)

$word.Quit()
