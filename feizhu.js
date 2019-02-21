const https = require('https');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const iconv = require('iconv-lite');
const safeEval = require('safe-eval');
const BufferHelper = require('BufferHelper');
const URL = require('url');
const querystring = require('querystring');


//Schema
const ProductSchema = new mongoose.Schema({
  title: String,
  tags: Array,
  subTitles:Array,
  shop: Object,
  descs: Array,
  scorce: Object,
  origins: Array,
  price:Object,
  id:String
});

const db = mongoose.createConnection('47.98.62.21','pig');
const ProductModel = db.model('Product',ProductSchema);

db.on('error',console.error.bind(console,'连接错误:'));
db.on('connected', console.info.bind(console, 'Ok'));


const getHtml = async (url, charset='utf-8') => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try{
        url = url.replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
        console.log(url);
        const bufferHelper = new BufferHelper();
        https.get(url, (res) => {
          res.on('data', (chunk) => {
            bufferHelper.concat(chunk);
          });

          res.on('end', () => {

            const bufferhelper = bufferHelper.toBuffer();
            let html = iconv.decode( bufferhelper, charset);
            resolve(cheerio.load(html, {decodeEntities: false}));
          });
        });

      }catch(e){
        console.log(e);
      }

    }, 300)
  });
};

// 获取旅游度假页面

getHtml('https://www.fliggy.com/dujia/').then(async ($) => {

  try{
    const categoryNodes = $('.nav-list .nav-section');
    for(let i = 2; i < categoryNodes.length; i++){
      const categoryNode = $(categoryNodes[i]);
      const areas = categoryNode.find('dl');
      const categorys = [categoryNode.find('h3').text()];
      for(let j = 0; j<areas.length;j++){
        const area = $(areas[j]);
        const links = area.find('a');
        categorys.push(area.find('dt').text());

        for(let k = 1; k < links.length; k++){
          const link = $(links[k]);
          await getPages(link.attr('href'));
        }
      }
    }

    console.log('爬取结束------');
    process.exit(1);
  }catch(e){
    console.log(e);
  }

});


// 获取总页码
const getPages = async (url) => {
  return getHtml(url).then(async ($) => {
    try {
      const pages = $('.page-num-box span').eq(1).text();
      for(let i = 1; i < pages; i++){
        await getProducts(url+'&pagenum='+i);
      }
    }catch (e) {
      console.log(e);
    }

  })
};


// 获取列表
const getProducts = async (url) => {
  return getHtml(url).then(async ($) => {
    try {
      const products = $('.product-list-wrap .product-wrap');
      console.log(products.length);
      for(let i = 0; i < products.length; i++){
        const product = $(products[i]);
        await getProduct(product.find('.title-wrap a').attr('href'));
      }
    }catch (e) {
      console.log(e);
    }

  })
};

const getProduct = async (url) => {
  const myURL = URL.parse(url);
  const querys = querystring.parse(myURL.query);
  return getHtml(url).then($ => {

    try{
      const json = {};
      const tagNodes = $('.title-txt .title-tag');
      const subTitleNodes = $('.item-subtitle-content li');
      const scoreNodes = $('.c-shop-card-top-scores a')
      const tags = [];
      const subTitles = [];
      const originNodes = $('.item-desc li').eq(0).find('.item-desc-content span');
      const origins = [];
      const bigPrice = $('.big-price span').text().split('-');
      const descNodes = $('.item-desc .item-desc-item');

      for(let i = 0; i<tagNodes.length;i++){
        tags.push($(tagNodes[i]).text());
      }

      for(let i = 0; i<subTitleNodes.length;i++){
        subTitles.push($(subTitleNodes[i]).text());
      }

      for(let i = 0; i<originNodes.length;i++){
        origins.push($(originNodes[i]).text());
      }

      const descs = [];
      for(let i = 0; i<descNodes.length;i++){
        const descNode = $(descNodes[i]);
        const contendNodes = descNode.find('.item-desc-content span');
        const contents = [];

        for(let j = 0; j<contendNodes.length;j++){
          const contentNode = $(contendNodes[j]);
          contents.push(contentNode.text())
        }
        descs.push({
          title: descNode.find('.item-desc-title').text(),
          contents: contents
        })
      }

      json.id = querys.id;
      json.title = $('.title-txt span').eq('0').text();
      json.tags = tags;
      json.subTitles = subTitles;
      json.shop = {
        name: $('.c-shop-logo-name').text()
      };
      json.descs = descs;
      json.scorce = {
        desc: $(scoreNodes[0]).text(),
        service: $(scoreNodes[1]).text(),
        logistics: $(scoreNodes[2]).text()
      };

      json.origins = origins;
      json.price = {
        min: Number(bigPrice[0])*100,
        max: Number(bigPrice[1])*100 || Number(bigPrice[0])*100
      };

      return json;
    }catch(e){
      console.log(e);
    }

  }).then(json => {
    const p = new ProductModel(json);
    return new Promise((resolve, reject) => {
      ProductModel.findOne({id: json.id}, (err, product) => {
        console.log(json);
        if(err){
          console.log('查询重复出错')
          reject()
        }
        console.log(product);
        if(!product){
          p.save(function(err){
            if(err){
              reject();
              console.log('err');
            }else{
              resolve();
              console.log(url + ':插入成功');
            }
          });
        }else{
          resolve();
        }
      })
    })
  });
};
