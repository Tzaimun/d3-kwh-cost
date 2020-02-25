
let dataset = []

//Dit is de class die gebruikt wordt in de uiteindelijke dataset. Deze class wordt aangeroepen per land, zoals de naam al sugereert. Hierdoor krijg ik een array met compacte objects met alleen de nodige data.
class Country {
  constructor(price_hh_data, eoteq_data, cc_data, iteration) {
    this.country = price_hh_data[iteration].GEO
    this.kWh_price = parseFloat(price_hh_data[iteration].Value)
    this.line_data = []
    for (let i = 0; i < eoteq_data[iteration].values.length; i++) {   //Hier maak ik een genestte array voor line_data. Hierdoor kan ik een line chart maken met dezelfde dataset als de bar chart
      let year = parseInt(eoteq_data[iteration].values[i].TIME)
      let co2_value = parseFloat(eoteq_data[iteration].values[i].Value.replace(/[,]/g, ''))
      this.line_data.push({year, co2_value})
    }
    this.ISO_2 = cc_data[iteration].alpha_2
  }
}

//Dit is de barchart, deze wordt aangeroepen in de promise onderaan in de code.
function barChart(dataset) {
  //Algemene variabelen
  const h = 500;
  const w = 1500;
  const bar_padding = 40;
  //Scales die gebruikt worden bij de rectangles en de axes.
  let xScale = d3.scaleBand()
    .domain(d3.range(dataset.length))
    .range([0, w])
    .paddingInner(0.2);
  let yScale = d3.scaleLinear()
    .domain([0, d3.max(dataset, d => d.kWh_price)])
    .range([0,h])
  //Deze scale lijkt veel op de scale hierboven, maar er zit 1 belangerijk verschil in, namelijk dat de h en de 0 in range zijn omgedraaid. Als ik voor de yAxis de normale yScale aanroep dan
  //gaan de waardes van boven naar beneden, i.p.v andersom. Zo ook moet ik een andere xScale maken voor de x-Axis, omdat ik bij deze Strings gebruik ipv getallen.
  let yAxScale = d3.scaleLinear()
    .domain([0, d3.max(dataset, d => d.kWh_price)])
    .range([h,0])
  let xAxScale = d3.scaleBand()
    .domain(d3.range(dataset.length))
    .range([0, w])
    .paddingInner(0.2)
  let rgbScale = d3.scaleLinear()
    .domain([0, d3.max(dataset, d => d.kWh_price)])
    .range([0, 0.9]);
  //Hier definieer ik de axes, deze roep ik later in de code aan.
  let xAxis = d3.axisBottom(xScale).tickFormat(i => dataset[i].ISO_2).tickSizeOuter(0)
  let yAxis = d3.axisLeft(yAxScale)
   
  //Hier begin ik dan met de daadwerkelijke rectangles te maken.
  let main_svg = d3.select('.bar-chart')
  main_svg.selectAll('rect')
    .data(dataset)
    .enter()
    .append('rect')
    .attr('fill', d => d3.interpolateInferno(rgbScale(d.kWh_price)))
    .attr('x', (d, i) => xScale(i)+bar_padding)   
    .attr('y', d => h-yScale(d.kWh_price)+bar_padding)
    .attr('width', xScale.bandwidth())
    .attr('height', d => yScale(d.kWh_price))
    .attr('data-legend', d => d.hover)
    //Deze mouseover is voor de tooltip. Deze tooltip roept de div #tooltip en haar kinderen aan. Standaard is deze div hidden, maar als ik er met mijn muis overheen ga is deze zichtbaar.
    //Doordat ik elke keer de xPos en de yPos opnieuw bereken kan ik een leuke animatie erin stoppen, waardoor het er toch nog iets beter uit ziet.
    .on('mouseover', function(d) {
      let xPos = parseFloat(d3.select(this).attr('x')) + xScale.bandwidth() / 2;
      let yPos = parseFloat(d3.select(this).attr('y')) / 2 + h / 2;
      d3.select('#tooltip')
        .transition()
        .duration(650)
        .style('left', xPos + 'px')
        .style('top', yPos + 'px')
        .select('#name')
        .text(d.country)
      d3.select('#tooltip')
        .select('#value')
        .text(d.kWh_price)
      d3.select('#tooltip').classed('hidden', false);
    })
    .on('mouseout', d => {
      d3.select('#tooltip').classed('hidden', true);
    })
  //Axes
  main_svg.append('g')
    .attr('transform', 'translate(' + bar_padding + ',' + (h+bar_padding) + ')')
    .call(xAxis)
  main_svg.append('g')
    .attr('transform', 'translate(' + bar_padding + ',' + bar_padding + ')')
    .call(yAxis);

  //Axes labels*/
  //y-label
  main_svg.append('text')
    .attr('class', 'y-label')
    .attr('transform', 'translate(' + -1.5*bar_padding + ',' + (h/3)*1.8 + ')')
    .text('€ / kWh')
  //x-label
  main_svg.append('text')
    .attr('class', 'x-label')
    .attr('transform', 'translate(' + 3/4*w + ',' + (h+0.2*h) + ')')
    .text('Countries in the EU')
  //titel
  main_svg.append('text')
    .attr('class', 'bar-title')
    .attr('transform', 'translate(' + 1/5*w + ',' + 0 + ')')
    .text('Cost of kWh per country in the EU.')
}


//Data aanroepen met een promise, en dan gebruiken.
Promise.all([
    d3.csv('/nrg_bal_c/energy_oil_tonnes_eq.csv'),
    d3.csv('/nrg_bal_c/energy_prices_household.csv'),
    d3.csv('/nrg_bal_c/slim-2_country_codes.csv')
  ]).then(files => {
    console.log(files)
    //Hiermee maak ik een nieuwe array, waarbij er gesorteerd is op het land. Hierdoor krijg je een genestte array met alle waarden met hetzelfde land bij elkaar, deze data is van de energy_oil_tonnes_eq.csv
    let eoteq_data = d3.nest()
        .key(d => d.GEO)
        .entries(files[0]);
    //Hier maak ik een array met de data van de energy_prices_household.csv   Ik heb deze loop gemaakt omdat ik heel veel data uit die csv niet nodig heb, en op deze manier alleen de nodige data gebruik. 
    //Dit vind ik practischer. De reden dat albanie en liechtenstein zo specifiek worden genoemd is omdat ik voor liechtenstein geen data had, en ik voor albanie alleen data uit 2018 had.
    let price_hh_data = []
    for (let i = 0; i < files[1].length; i++) {
      if (files[1][i].TIME == '2019S1' && files[1][i].CURRENCY == 'Euro' && files[1][i].TAX == 'All taxes and levies included' && files[1][i].GEO != 'Liechtenstein' && files[1][i].GEO != 'Albania') {
        price_hh_data.push(files[1][i])
      } else if (files[1][i].GEO == 'Albania' && files[1][i].CURRENCY == 'Euro' && files[1][i].TAX == 'All taxes and levies included' && files[1][i].TIME == '2018S2') {
        price_hh_data.push(files[1][i])
      }
    };
    console.log(price_hh_data)
    let price_hh_data_sorted = price_hh_data.sort((a, b) => a.GEO - b.GEO)
    console.log(price_hh_data_sorted)
    let cc_data = []
    for (let i = 0; i < files[2].length; i++) {
      for (let j = 0; j < price_hh_data.length; j++) {
        if(files[2][i].name == price_hh_data[j].GEO) {
          cc_data.push(files[2][i])
        }
      }
    }
    //console.log(price_hh_data.GEO.filter(x => !cc_data.name.includes(x)));
    //console.log(cc_data)
    //Hier maak ik de uiteindelijke array waarbij de twee bovenstaande arrays worden gecombineerd. Ik gebruik hiervoor een class. Deze class staat helemaal bovenaan.
    for (let i = 0; i < price_hh_data.length; i++) {
      dataset.push(new Country(price_hh_data, eoteq_data, cc_data, i))
    }

    //Sorteer de dataset
    //console.log(dataset)
    //Ik gebruik functies zodat het makkelijker is om 2 charts in 1 pagina te hebben, zonder dat ik last heb van functies die over elkaar heen schrijven (denk aan scales etc)
    barChart(dataset)
    //Voor als er iets mis gaat in de promise, dan wordt de gebruiker hiervan gewaarschuwd.
    
})/*.catch(err =>  {
    alert('There seems to be an error loading the data, please try again')
  })*/