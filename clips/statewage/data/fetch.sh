for s in AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY; do
  for k in 1 2 3; do curl -sS -m 25 "https://fred.stlouisfed.org/graph/fredgraph.csv?id=STTMINWG$s&cosd=1968-01-01" -o f_$s.csv; head -1 f_$s.csv | grep -q "observation_date" && break; sleep 2; done
  echo "$s $(head -1 f_$s.csv | cut -c1-20) $(wc -l < f_$s.csv)"
done
