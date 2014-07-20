(function(root) {

var utils = {};

utils.add_unique = function(arr, obj, comp)
{
  if ( !utils.has(arr, obj, comp) ) 
    arr.push( obj );
}

utils.has = function(arr, obj, comp) 
{
  return utils.indexof(arr, obj, comp) !== -1;
}

utils.indexof = function(arr, obj, comp) 
{
  if ( ! utils.is_arr(arr) )
  return -1;

  var i = arr.length;
  while (i--)
  {
    //if (!!key)
      //if ( arr[i][key] === obj[key] )
    if (!!comp)
      if ( comp( arr[i], obj ) )
        return i;
    else
      if ( arr[i] === obj )
        return i;
  }
  return -1;
}

utils.is_arr = function(obj) 
{
  return Object.prototype.toString.call(obj) === "[object Array]";
}

utils.lerp2d = function(x, x1, x2, y1, y2)
{
  return (x-x1) / (x2-x1) * (y2-y1) + y1;
}

root.utils = utils;

})(window);
