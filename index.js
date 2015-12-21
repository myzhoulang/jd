var cheerio = require('cheerio')
var http = require('http')
var iconv = require('iconv-lite')
var BufferHelper = require('BufferHelper')
var Q = require('q')
var mongoose = require('mongoose')
var fs = require('fs')
//var JSON = require('JSON')

var id = 0
var IndexData = []

//获取第一页的数据 提取URL
function getIndexHtml(url, charset){
  var def = Q.defer();
  http.get(url, function(res){
    var bufferHelper = new BufferHelper()

    res.on('data', function(chunk){
      bufferHelper.concat(chunk)
    })


    res.on('end', function(){
      var bufferhelper = bufferHelper.toBuffer();
      html = iconv.decode( bufferhelper, charset );
      def.resolve(html)
    })

  }).on('error', function(e){
    console.log('错误：' + e.message)
  })
  
  return def.promise
}

function getPage(url, obj){
  var def = Q.defer()
  getIndexHtml(url, 'utf-8').then(function(data){
    var $ = cheerio.load(data, {decodeEntities: false})
    obj.maxPage = $('.p-skip b').text()
    obj.currentPage = 0
    def.resolve(obj)
  })
  return def.promise
}

//提取 第一分类下的URL
getIndexHtml('http://channel.jd.com/kitchenware.html', 'gbk').then(function(data){
  
  var def = Q.defer()
 
  var $ = cheerio.load(data, {decodeEntities: false})
 
  var $Items = $('#storeCategorys > .item')
  
  $Items.each(function(index, item){
    var item = $(item)
    var childs = []
    var aAs = item.find('dd a')
    for(var len = aAs.length; len--; ){
      var a = $(aAs[len])
      childs.push({
        name: a.text(),
        id: id++,
        url: a.attr('href')
      })
    }
    
    IndexData.push({
      id: id++,
      name: item.find('dt a').text(),
      child: childs
    })
  })
  return JSON.stringify(IndexData)
}).then(function(data){
  var def = Q.defer()

  var defs = []
  var data = JSON.parse(data)
  data.forEach(function(item){
    if(Array.isArray(item.child)){
      item.child.forEach(function(item2){
        defs.push(getPage(item2.url, item2))
      })
    }
  })
//  [{"name":"火锅","id":0,"url":"http://list.jd.com/list.html?cat=6196,6197,11976"},{"name":"水壶","id":1,"url":"http://list.jd.com/list.html?cat=6196,6197,6207"},{"name":"煲类","id":2,"url":"http://list.jd.com/list.html?cat=6196,6197,6206"},{"name":"锅具套装","id":3,"url":"http://list.jd.com/list.html?cat=6196,6197,6205"},{"name":"奶锅","id":4,"url":"http://list.jd.com/list.html?cat=6196,6197,6204"},{"name":"汤锅","id":5,"url":"http://list.jd.com/list.html?cat=6196,6197,6203"},{"name":"压力锅","id":6,"url":"http://list.jd.com/list.html?cat=6196,6197,6201"},{"name":"蒸锅","id":7,"url":"http://list.jd.com/list.html?cat=6196,6197,6202"},{"name":"煎锅","id":8,"url":"http://list.jd.com/list.html?cat=6196,6197,6200"},{"name":"炒锅","id":9,"url":"http://list.jd.com/list.html?cat=6196,6197,6199"}]
  
//  data.forEach(function(item){
//    if(Array.isArray(item.child)){
//      item.child.forEach(function(item2){
//        getIndexHtml(item2.url).then(function(){
//          
//        })
//      })
//    }
//    
//  })
  Q.all(defs).then(function(result){
    console.log(result)
    def.resolve(JSON.stringify(result))
  })
  return def.promise
}).then(function(data){
  fs.writeFile('./data.json', data, {flag: 'w'}, function(err){
    if(err){
      console.log('write data error', err)
    }
  })
})


//getIndexHtml('http://list.jd.com/list.html?cat=6196,6197,11976', 'utf-8').then(function(data){
//  var def = Q.defer()
//  var defs = []
//  var $ = cheerio.load(data, {decodeEntities: false})
//  
//  
//  
//  console.log($('.p-skip b').text())
//})