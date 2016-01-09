var cheerio = require('cheerio')
var http = require('http')
var iconv = require('iconv-lite')
var BufferHelper = require('BufferHelper')
var Q = require('q')
var mongoose = require('mongoose')
var fs = require('fs')
var path = require('path')

var id = 0
var IndexData = []
var productId = 0
var datas = []


var ProductSchema = new mongoose.Schema({
  tag: String,
  price: String,
  url:String,
  id: Number,
  attrs:Array,
  images: Array,
  subtitle: String,
  name: String 
});


var db = mongoose.createConnection('127.0.0.1','jd') //创建一个数据库连接
var ProductModel = db.model('Product',ProductSchema)

db.on('error',console.error.bind(console,'连接错误:'))
db.on('connected', console.info.bind(console, 'Ok'))

//获取第一页的数据 提取URL
function getIndexHtml(url, charset){
  
  var def = Q.defer();
  setTimeout(function(){
    http.get(url, function(res){
      var bufferHelper = new BufferHelper()

      res.on('data', function(chunk){
        bufferHelper.concat(chunk)
      })
      res.on('end', function(){
        var bufferhelper = bufferHelper.toBuffer()
        html = iconv.decode( bufferhelper, charset )
        def.resolve(html)
      })

    }).on('error', function(e){
      console.log(url)
      console.log('错误：' + e.message)
    })
  },100)
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
// getIndexHtml('http://channel.jd.com/kitchenware.html', 'gbk').then(function(data){
  
//   var def = Q.defer()
 
//   var $ = cheerio.load(data, {decodeEntities: false})
 
//   var $Items = $('#storeCategorys > .item')
  
//   $Items.each(function(index, item){
//     var item = $(item)
//     var childs = []
//     var aAs = item.find('dd a')
//     for(var len = aAs.length; len--; ){
//       var a = $(aAs[len])
//       childs.push({
//         name: a.text(),
//         tag: item.find('dt a').text(),
//         id: id++,
//         url: a.attr('href')
//       })
//     }
    
//     IndexData.push({
//       id: id++,
//       name: item.find('dt a').text(),
//       child: childs
//     })
//   })
//   return JSON.stringify(IndexData)
// }).then(function(data){
//   var def = Q.defer()
//   var defs = []
//   var data = JSON.parse(data)

//   data.forEach(function(item){
//     if(Array.isArray(item.child)){
//       item.child.forEach(function(item2){
//         defs.push(getPage(item2.url, item2))
//       })
//     }
//   })
//   Q.all(defs).then(function(result){
//     def.resolve(JSON.stringify(data))
//   })
//   return def.promise
// }).then(function(data){

//   fs.writeFile('./data.json', data, {flag: 'w'}, function(err){
//     if(err){
//       console.log('write data error', err)
//     }
//   })
//   var arrUrls = []
//   var data = JSON.parse(data)
//   for(var len = data.length; len--;){
//     var item = data[len]
//     arrUrls = arrUrls.concat(item.child)
//   }
//   return  arrUrls
// }).then(function(data){
//   var result = data
//   data.forEach(function(item){
//     var maxPage = item.maxPage | 0
//     var startPage = item.currentPage
//     var tag =  item.tag + ' ' +item.name

//     while(startPage < maxPage){
//       var url = item.url + '&page='+(startPage+1)
//       getIndexHtml(url, 'utf-8').then(function(data){
//         item.currentPage = startPage+1
//         var urls = []
//         var defs = []
//         var $ = cheerio.load(data, {decodeEntities: false})
//         var aAs = $('#plist .p-img a')
//         var aPrice = $('.p-price')

//         var length = aAs.length
//         for(;length--;){
//           var aA = $(aAs[length])
//           var price = $(aPrice[length]).html()
//           defs.push(getProduct(aA.attr('href'), {
//             tag: tag,
//             price: price,
//             url: aA.attr('href')
//           }))
//         }
//       })
//       startPage++
//     }
//   })
// })



function getUrls(){
  var def = Q.defer()
  fs.readFile('./data.json', 'utf-8', function(err, data){
    
    if(err){
      console.log('error')
    }
    def.resolve(data)
  })
  return def.promise
}

getUrls().then(function(data){
  var urls = []
  var data = JSON.parse(data)

  data.forEach(function(item){
    urls = urls.concat(item.child)
  })

  return urls
}).then(function(data){
  var i = 0

  // {"name":"火锅","tag":"烹饪锅具","id":0,"url":"http://list.jd.com/list.html?cat=6196,6197,11976","maxPage":"39","currentPage":0}
  data.forEach(function(item){
    var maxPage = item.maxPage | 0
    var startPage = item.currentPage
    var tag =  item.tag + ' ' +item.name
    while(startPage < maxPage){
      var url = item.url + '&page='+(++startPage)
      getItemPage(url, startPage, tag, item)
    }

  })
})

function getItemPage(url, startPage, tag, item){
  var def = Q.defer()
  getIndexHtml(url, 'utf-8').then(function(data){
    item.currentPage = startPage+1
    var urls = []
    var defs = []
    var $ = cheerio.load(data, {decodeEntities: false})
    var aAs = $('#plist .p-img a')
    var aPrice = $('.p-price')

    var length = aAs.length

    for(;length--;){
      var aA = $(aAs[length])
      var price = $(aPrice[length]).html()
      defs.push(getProduct(aA.attr('href'), {
        tag: tag,
        price: price,
        url: aA.attr('href')
      }))
    }
  })
  return def.promise
}


function getProduct(url, obj){
  var def = Q.defer()
  getIndexHtml(url, 'gbk').then(function(data){
    var $ = cheerio.load(data, {decodeEntities: false})
    var images = $('#spec-list .spec-items img')
    var params = $('#parameter2 li')
    
    obj.id = productId
    obj.attrs = getAttrs($,params)
    obj.images = getImages($,images)
    obj.name = $('#name h1').text()
    obj.subtitle = $('#p-ad').text() || ''

    productId++
    return url
  }).then(function(url){
    return getPrice(path.basename(url, '.html'), obj)
  }).then(function(data){
    console.log(data)
    var p = new  ProductModel(data)
    // p.save(function(err){
    //   if(err){
    //     console.log('err')
    //   }else{
    //     console.log(data.name + ':插入成功')
    //   }
    // })
    // def.resolve(data)
  })
  return def.promise
}


//获取商品图片
function getImages($,nodes){
  var arr = []
  var host = 'http://img10.360buyimg.com/n1/'
  for(var length = nodes.length; length--;){
    var item = $(nodes[length])
    arr.push(host + item.attr('data-url'))
  }
  return arr
}

//获取商品属性

function getAttrs($,nodes){
  var arr = []
  for(var length = nodes.length; length--;){
    var item = $(nodes[length])
    var attr = item.text().split('：')
    var obj = {
      attrName: attr[0],
      attrVal:attr[1],
    }
    arr.push(obj)
  }
  // console.log(arr)
  return arr
}

function getPrice(id, obj){
  var def = Q.defer()
  getIndexHtml('http://p.3.cn/prices/mgets?skuIds=J_'+id, 'utf-8').then(function(data){
    var data = JSON.parse(data)
    obj.price = data[0].p
    def.resolve(obj)
  })
  return def.promise
}

