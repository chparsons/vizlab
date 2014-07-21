
(function() {

var max_nodes = 400;

var tooltip = d3.select('body')
	.append('div')
  .attr('class','tooltip')
	.style('visibility', 'hidden');

function grafo( opt )
{

  opt = $.extend({
    tabla: {},
    partido_r: 6,
    node_r: { min: 2, max: 10 },
    charge: -18,
    link_dist: 20
  }, opt );

  //persona fisica, juridica, agrupacion, lista
  var tipos = ['F','J','A','L']; 

  var w = 500, 
      h = 500;

  var node, link;

  var force = d3.layout.force()
    .charge( opt.charge )
    .linkDistance( opt.link_dist )
    .size([w, h]);

  //var color = d3.scale.category10();
  //var color = function(num) { return 'q' + num + '-3'; };
  //var color = function(num) { return colorbrewer.Spectral[4][num]; };
  var color = function(num) { return colorbrewer.Dark2[8][ num+3 ]; };

  load_data( opt, function( res ) {

    var data = parse( res, opt );

    force
      .nodes( data.nodes )
      .links( data.links )
      .start();

    var svg = d3.select( opt.el )
      .append('svg')
      .attr('width', w)
      .attr('height', h);

    render( svg, data );

    force.on('tick', tick); 
  });

  function render( svg, data ) 
  {
    //console.log('render', data);  

    //link eg: {source:1, target:0, value:1}
    link = svg.selectAll('line.link')
      .data( data.links )
      .enter().append('line')
      .attr('class', 'link');
    //.style('stroke-width', 1)
    //.style('stroke', '#999');
    //.style('stroke-width', function(d) { 
      //return Math.sqrt( d.value ); 
    //});

    //node eg: {name:Napoleon, group:1}
    node = svg.selectAll('circle.node')
      .data( data.nodes )
      .enter().append('circle')
      .attr('class', 'node')
      //.attr('r', 5)
      .attr('r', function(d) 
      { 
        return !!d.importe ? 
          utils.lerp2d( d.importe, 
            0, data.max.importe, 
            opt.node_r.min, 
            opt.node_r.max ) : 
            opt.partido_r;
      })
      .style('fill', function(d) { return color( d.ntipo ); })
      //.attr('class', function(d) { return color( d.ntipo ); })
      //.style('stroke-width', 1)
      //.style('stroke', '#fff')
      .call( force.drag );

    //node
      //.append('title')
      //.text( tooltip_txt );

    node
      .on('mouseover', function(d){
        return tooltip
          .text( tooltip_txt(d) )
          .style('visibility', 'visible');
      })

      .on('mousemove', function(){
        return tooltip
          .style('top', (event.pageY-10)+'px')
          .style('left',(event.pageX+10)+'px');
      })

      .on('mouseout', function(){
        return tooltip.style('visibility', 'hidden');
      })

      .on('click', function(d) {
        var url;
        if ( d.tipo === 'A' ) //agrupacion
        {
          url = 'https://www.google.com/search?q='+d.name.replace(/ /g,'+');
        }

        else 
        {
          url = opt.tabla.search_url_aportante(d);
        }
        window.open( url );
      });

  }

  function tooltip_txt(d)
  {
    var pp = d.importe ? d.importe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '...';
    return d.tipo === 'F' || d.tipo === 'J' ? d.name + ' : ' + pp + ' $' : d.name;
  }

  function tick() 
  {
    link
      .attr('x1', function(d) { return d.source.x; })
      .attr('y1', function(d) { return d.source.y; })
      .attr('x2', function(d) { return d.target.x; })
      .attr('y2', function(d) { return d.target.y; });

    node
      .attr('cx', function(d) { return d.x; })
      .attr('cy', function(d) { return d.y; });
  }

  function load_data( opt, callback )
  {
    //https://developers.google.com/fusiontables/docs/v1/using#queryData

    var url = 'https://www.googleapis.com/fusiontables/v1/query';
    url += '?sql=' + encodeURIComponent( opt.tabla.query );
    url += '&key=AIzaSyBKRM2ZoKCMyyt0lTruGKbpqQgiAT1vetk';

    $.ajax({
      url: url,
      success: callback
    });
  }

  function parse( json, opt )
  {
    var nodes = [],
        links = [],
        max = { importe: 0 },
        partidos = [],
        aportantes = [];

    // nodes

    var len = opt.max_nodes,
        i = 0;

    var datum, item,
        src, dst,
        tipo;

    for (i = 0; i < len; i++)
    {
      datum = json.rows[i];
      item = new Item(datum, json);

      tipo = 'A'; //agrupacion
      dst = {
        name: opt.tabla.campos.agrupacion( item ),
        importe: undefined,
        tipo: tipo,
        ntipo: _.indexOf(tipos, tipo)
      };

      tipo = opt.tabla.campos.tipo(item);
      src = {
        name: opt.tabla.campos.aportante( item ),
        importe: opt.tabla.campos.importe( item ),
        tipo: tipo,
        ntipo: _.indexOf(tipos, tipo),
        dst: [dst]
        //data: datum
      }; 

      var ii = utils.indexof( nodes, src, opt.tabla.comp );
      if (ii > -1)
      {
        //console.log( src.name, 'ya existe como', nodes[ii].name );
        nodes[ii].importe += src.importe;
        nodes[ii].dst.push( dst );
        update_max( nodes[ii] );
      }
      else
      {
        nodes.push( src );
        update_max( src ); 
      }

      //utils.add_unique( nodes, src, opt.tabla.comp );
      utils.add_unique( nodes, dst, opt.tabla.comp );
      utils.add_unique( aportantes, src, opt.tabla.comp ); 
      utils.add_unique( partidos, dst, opt.tabla.comp ); 
    }

    // links 

    var j, k, 
        linkslen,
        srclen = aportantes.length;

    for (j = 0; j < srclen; j++)
    {
      src = aportantes[j];
      linkslen = src.dst.length;

      for (k = 0; k < linkslen; k++)
      {
        links.push({
          source: utils.indexof( nodes, src, opt.tabla.comp ),
          target: utils.indexof( nodes, src.dst[k], opt.tabla.comp )
        });
      }
    }

    //

    function Item( datum, json ) {
      this.get = function( key )
      {
        key = _.isArray(key) ? key : [key];
        for ( var k in key ) {
          var i = _.indexOf( json.columns, key[k] ); 
          if ( i > -1 )
            return datum[ i ];
        }
        //return datum[ _.indexOf( json.columns, key ) ];
      }
    }

    function update_max(d)
    {
      if ( d.importe > max.importe )
        max = d;
    } 

    //console.log( 'nodes', nodes );
    //console.log( 'links', links );
    //console.log( 'max', max );

    return {
      nodes: nodes,
      links: links,
      max: max,
      partidos: partidos,
      aportantes: aportantes
    };
  }
};

//init

//grafo 07-09-11

(function() {

  var tabla_id = '1A9dgQIHqybDHAx9eZV0zwJrBD_omYW5xDBfLHFI';
  var campo_importe = 'IMPORTE';

  var tabla_07_09_11 = { 

    id: tabla_id,

    campos: {
      aportante: function(item) {
        return item.get('APORTANTE');
      },
      agrupacion: function(item) {
        return item.get('AGRUPACION');
      },
      importe: function(item) {
        return parseFloat( item.get(campo_importe).toString().replace(/,/g,'') );
      },
      tipo: function(item) {
        var tmap = {
          'persona física': 'F',
          'persona jurídica': 'J',
          'agrupacion': 'A',
          'lista': 'L'
        };
        return tmap[ item.get('SUBINCISO').toLowerCase() ];
      },
    }, 

    search_url_aportante: function(d) {
      var col = 'col4'; //aportante
      return "https://www.google.com/fusiontables/embedviz?viz=GVIZ&t=TABLE&q=select+col0%2C+col1%2C+col2%2C+col3%2C+col4%2C+col5%2C+col6%2C+col7%2C+col8%2C+col9%2C+col10%2C+col11%2C+col12%2C+col13%2C+col14%2C+col15+from+"+ tabla_id +"+where+"+ col +"+CONTAINS+'"+ d.name.split(',')[0] +"'&containerId=googft-gviz-canvas";
    },

    query: "SELECT * FROM "+tabla_id+" ORDER BY '"+campo_importe+"' DESC LIMIT "+max_nodes,
    //var query = "SELECT * FROM " + docid + " WHERE CICLO=2011 ORDER BY '"+campo_importe+"' DESC LIMIT " + opt.max_nodes;
    //var filters = [ 'CICLO=2011' ];
    //var order = "'"+campo_importe+"' DESC";
    //query.push('WHERE ');
    //for (var i = 0; i < filters.length; i++)
    //{
      //query.push( filters[i]+' ' );
    //}
    //query.push( 'ORDER BY ' + order );

    comp: function( a, b ) 
    {
      // persona fisica: checkear x apellido
      //if ( a.tipo === 'F' && b.tipo === 'F' && is_valid(a.name) && is_valid(b.name) )
        //return a.name.split(',')[0] === b.name.split(',')[0];

      return a.name === b.name;

      //function is_valid(name)
      //{
        //return name.indexOf('RECIBO') === -1;
      //}

    } 
  };  

  grafo({
    el: '#grafo-07-09-11',
    tabla: tabla_07_09_11,
    max_nodes: max_nodes
  });

})();



//grafo 2013 grales generales

(function() {

  var tabla_id = '1z1FDmVXumCXfB_36SqW5SbSvjZ_4xWt8td65abfk';
  var campo_importe = 'Total Aporte ($)';

  var tabla_2013_grales = { 

    id: tabla_id,

    campos: {
      aportante: function(item) {
        return [
          item.get('apellido'),
          ', ',
          item.get('nombre')
        ].join('');
      },
      agrupacion: function(item) {
        return item.get('Partido');
      },
      importe: function(item) {
        return parseFloat( item.get(campo_importe).toString().replace(/,/g,'') );
      },
      tipo: function(item) {
        return item.get('nombre') === 'SA' ? 'J' : 'F';
      },
    },

    search_url_aportante: function(d) {
      var col = 'col2'; //apellido
      return "https://www.google.com/fusiontables/embedviz?viz=GVIZ&t=TABLE&q=select+col0%2C+col1%2C+col2%2C+col3%2C+col4%2C+col5%2C+col6%2C+col7%2C+col8+from+"+ tabla_id +"+where+"+ col +"+CONTAINS+'"+ d.name.split(',')[0] +"'&containerId=googft-gviz-canvas";
    },

    query: "SELECT * FROM "+tabla_id+" ORDER BY '"+campo_importe+"' DESC LIMIT "+max_nodes,

    comp: function( a, b ) 
    {
      return a.name === b.name;
    }
  }; 

  grafo({
    el: '#grafo-2013-grales',
    tabla: tabla_2013_grales,
    max_nodes: max_nodes,
    node_r: { min: 2, max: 9 },
    charge: -12,
    link_dist: 22
  });

})();


//grafo 2013 primarias

//(function() {

  //var tabla_id = '1sh1zUF0IFUw4t6mLiWYvXaoxQm-hkU37aOQp4_fM';
  //var campo_importe = 'IMPORTE ($)';

  //var tabla_2013_primarias = { 

    //id: tabla_id,

    //campos: {
      //aportante: function(item) {
        //return [
          //item.get('APELLIDO'),
          //', ',
          //item.get('NOMBRE')
        //].join('');
      //},
      //agrupacion: function(item) {
        //return item.get('AGRUPACION');
      //},
      //importe: function(item) {
        //return parseFloat( item.get(campo_importe).toString().replace(/,/g,'') );
      //},
      //tipo: function(item) {
        //return item.get('nombre') === 'SA' ? 'J' : 'F';
      //},
    //},

    //search_url_aportante: function(d) {
      //var col = 'col7'; //apellido
      //return "https://www.google.com/fusiontables/embedviz?viz=GVIZ&t=TABLE&q=select+col0%2C+col1%2C+col2%2C+col3%2C+col4%2C+col5%2C+col6%2C+col7%2C+col8%2C+col9%2C+col10%2C+col11%2C+col12%2C+col13+from+"+ tabla_id +"+where+"+ col +"+CONTAINS+'"+ d.name.split(',')[0] +"&containerId=googft-gviz-canvas";
    //},

    //query: "SELECT * FROM "+tabla_id+" ORDER BY '"+campo_importe+"' DESC LIMIT "+max_nodes,

    //comp: function( a, b ) 
    //{
      //return a.name === b.name;
    //}
  //}; 

  //grafo({
    //el: '#grafo-2013-primarias',
    //tabla: tabla_2013_primarias,
    //max_nodes: max_nodes,
    //node_r: { min: 3, max: 12 },
    //charge: -20,
    //link_dist: 24
  //});

//})();


})();

