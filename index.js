var cheerio = require('cheerio')
var http = require('http')
var iconv = require('iconv-lite')
var BufferHelper = require('BufferHelper')
var Q = require('q')
var mongoose = require('mongoose')

var id = 0


//获取第一页的数据 提取URL
function getIndexHtml(url){
  var def = Q.defer();
  http.get(url, function(res){
    var bufferHelper = new BufferHelper()

    res.on('data', function(chunk){
      bufferHelper.concat(chunk)
    })


    res.on('end', function(){
      var bufferhelper = bufferHelper.toBuffer();
      html = iconv.decode( bufferhelper, 'GBK' );
      def.resolve(html)
    })

  }).on('error', function(e){
    console.log('错误：' + e.message)
  })
  
  return def.promise
}

//提取 第一分类下的URL
getIndexHtml('http://channel.jd.com/kitchenware.html').then(function(data){
  var def = Q.defer()
  var defs = []
  var $ = cheerio.load(data, {decodeEntities: false})
  var IndexData = []
  var $Items = $('#storeCategorys').find('.item')
  
  $Items.each(function(index, item){
    var item = $(item)
    var childs = []
    var aAs = item.find('dd a')
    
    item.find('dd a').each(function(a){
      var a = $(a)
      childs.push({
        name: a.text(),
        id: id++,
        url: a.attr('href')
      })
    })
    
    IndexData.push({
      id: id++,
      name: item.find('dt a').text(),
      child: childs
    })
  })
  
  return def.promise
}).then(function(data){
  console.log(data)
})