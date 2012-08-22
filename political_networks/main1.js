//AGRUPACION: 'AFIRMACION PARA UNA REPUBLICA IGUALITARIA'
//APORTANTE: 'JOAN, JAVIER'
//CATEGORIA: 'EGRESOS DE LA CAMPAÑA'
//CICLO: '2007'
//CUIT/L: '20-04557935-3'
//DISTRITO: 'Capital Federal'
//ELECCION: 'Presidente y Vice'
//FECHA: '4/09/2007'
//IMPORTE: '1000'
//INCISO: 'Contribuciones y donaciones privadas'
//KEY: 'C2007-D1-A608-L652-PRE'
//LISTA: 'AFIRMACION PARA UNA REPUBLICA IGUALITARIA'
//ORDEN: 'Nacional'
//SUBINCISO: 'Persona física'
//TIPO: 'Partido Nacional con Sede Central en el Distrito'

(function(utils) {

var max_nodes = 400,
    node_r = { min: 2, max: 10 },
    partido_r = 5;

var w = 500, 
    h = 500;

var node, link;

var force = d3.layout.force()
    .charge(-18)
    .linkDistance(20)
    .size([w, h]);

var color = d3.scale.category10();
//var color = function(num) { return 'q' + num + '-3'; };
    
//$('body').css('background-color', '#000');
$('body').css('margin','0px');

var svg = d3.select('#vis').append('svg')
    .attr('width', w)
    .attr('height', h)
    .attr('class', 'GnBu');

load_data(init, {
    max_nodes: max_nodes
});

function init(data) 
{
    //console.log('init', data); 

    force
        .nodes(data.nodes)
        .links(data.links)
        .start(); 

    //link eg: {source:1, target:0, value:1}
    link = svg.selectAll('line.link')
        .data(data.links)
        .enter().append('line')
        .attr('class', 'link');
        //.style('stroke-width', 1)
        //.style('stroke', '#999');
        //.style('stroke-width', function(d) { 
            //return Math.sqrt( d.value ); 
        //});

    //node eg: {name:Napoleon, group:1}
    node = svg.selectAll('circle.node')
        .data(data.nodes)
        .enter().append('circle')
        .attr('class', 'node')
        //.attr('r', 5)
        .attr('r', function(d) 
        { 
            return !!d.importe ? 
                utils.lerp2d( d.importe, 
                    0, data.max.importe, 
                    node_r.min, node_r.max ) : 
                partido_r;
        })
        .style('fill', function(d) { return color( d.ntipo ); })
        //.attr('class', function(d) { return color( d.ntipo ); })
        //.style('stroke-width', 1)
        //.style('stroke', '#fff')
        .call(force.drag);    

    node.append("title")
        .text(function(d) { return d.name; });

    force.on("tick", tick);

    $('circle').click( function() 
    {
        var query = $(this).find('title').text().replace(' ','+');
        var url = 'https://www.google.com/search?q='+query;
        window.open(url);
    });
}

function tick() 
{
    link.attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; });

    node.attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; });
}

function load_data(callback, opt)
{
    //https://developers.google.com/fusiontables/docs/v1/using#queryData

    //var query = "SELECT * FROM " + docid + " WHERE CICLO=2011 ORDER BY 'IMPORTE' DESC LIMIT " + opt.max_nodes;
    var query = "SELECT * FROM 1A9dgQIHqybDHAx9eZV0zwJrBD_omYW5xDBfLHFI ORDER BY 'IMPORTE' DESC LIMIT " + opt.max_nodes;

    //var filters = [ 'CICLO=2011' ];
    //var order = "'IMPORTE' DESC";
    //query.push('WHERE ');
    //for (var i = 0; i < filters.length; i++)
    //{
        //query.push( filters[i]+' ' );
    //}
    //query.push( 'ORDER BY ' + order );
    
    var url = 'https://www.googleapis.com/fusiontables/v1/query';
    url += '?sql=' + encodeURIComponent(query);
    url += '&key=AIzaSyBKRM2ZoKCMyyt0lTruGKbpqQgiAT1vetk';
    
    $.ajax({
        url: url,
        dataType: 'jsonp',
        success: function(json)
        {
            //console.log('loaded', json);
            if (typeof callback === 'function')
                callback( parse(json) );
        }
    });

    function parse(json)
    {
        var nodes = [],
            links = [],
            max = { importe: 0 },
            partidos = [],
            aportantes = [];

        // nodes

        var len = opt.max_nodes,
            i = 0;

        var el, 
            from, to,
            tipo;

        for (i = 0; i < len; i++)
        {
            el = json.rows[i];

            tipo = tipo2str('agrupacion');

            to = 
            {
                name: get(el,'AGRUPACION'), //el.LISTA
                importe: undefined,
                tipo: tipo,
                ntipo: tipo2num(tipo)
            };

            tipo = tipo2str( get(el,'SUBINCISO') );

            from = 
            {
                name: get(el,'APORTANTE'),
                importe: parseInt( get(el,'IMPORTE'), 10 ),
                tipo: tipo,
                ntipo: tipo2num(tipo),
                to: [to],
                data: el
            }; 

            var ii = utils.indexof( nodes, from, equals );
            if (ii > -1)
            {
                //console.log( from.name, 'ya existe como', nodes[ii].name );
                nodes[ii].importe += from.importe;
                nodes[ii].to.push( to );
                add_max( nodes[ii] );
            }
            else
            {
                nodes.push( from );
                add_max( from ); 
            }

            //utils.add_unique( nodes, from, equals );
            utils.add_unique( nodes, to, equals );

            utils.add_unique( aportantes, from, equals ); 
            utils.add_unique( partidos, to, equals ); 
        }

        // links 

        var j, k, 
            linkslen,
            fromlen = aportantes.length;

        for (j = 0; j < fromlen; j++)
        {
            from = aportantes[j];
            linkslen = from.to.length;

            for (k = 0; k < linkslen; k++)
            {
                links.push({
                    source: utils.indexof( nodes, from, equals ),
                    target: utils.indexof( nodes, from.to[k], equals )
                });
            }
        }

        //

        function get(el, key)
        {
            return el[ _.indexOf( json.columns, key ) ];
            //return el[key]; //cvs
        }

        function add_max(item)
        {
            if ( item.importe > max.importe )
                max = item;
        }

        function equals( a, b ) 
        {
            // persona fisica: checkear x apellido
            if ( a.tipo === 'F' && b.tipo === 'F' && is_valid(a.name) && is_valid(b.name) )
                return a.name.split(',')[0] === b.name.split(',')[0];

            return a.name === b.name;
        }

        function is_valid(name)
        {
            return name.indexOf('RECIBO') == -1;
        }

        function tipo2str(rawtipo) 
        {
            switch(rawtipo)
            {
                case 'Persona física':
                    return 'F';
                case 'Persona jurídica':
                    return 'J';
                case 'agrupacion':
                    return 'A';
                case 'lista':
                    return 'L';
                default:
                    return null;
            }
        }

        function tipo2num(tipo) 
        {
            switch(tipo)
            {
                case 'F':
                    return 0;
                case 'J':
                    return 1;
                case 'A':
                    return 2;
                case 'L':
                    return 3;
                default:
                    return -1;
            }
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
}

})(utils);

