const cheerio = require('cheerio');
const https = require('follow-redirects').https;
const http = require('http');
const iconv = require('iconv-lite');
const BufferHelper = require('BufferHelper');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const URL = require('url');

//Schema
const ProductSchema = new mongoose.Schema({
  tag: Array,
  price: String,
  url:String,
  id: Number,
  attrs:Array,
  images: Array,
  subtitle: String,
  name: String
});
// const db = mongoose.createConnection('47.98.62.21','jd');
// const ProductModel = db.model('Product',ProductSchema);

// db.on('error',console.error.bind(console,'连接错误:'));
// db.on('connected', console.info.bind(console, 'Ok'));

const getHtml = async (url, charset='gbk') => {
  if(URL.parse(url).protocol !== 'https:'){
    url = 'https:' + url;
  }
  // console.log(url)
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const bufferHelper = new BufferHelper();
      https.get(url, (res) => {
        // console.log(res)
        res.on('data', (chunk) => {
          bufferHelper.concat(chunk);
        });

        res.on('end', () => {
          const bufferhelper = bufferHelper.toBuffer();
          let html = iconv.decode( bufferhelper, charset);
          resolve(html);
        });
      });
    }, 200)

  });
};

getHtml('https://channel.jd.com/furniture.html').then(async data => {
  const $ = cheerio.load(data, {decodeEntities: false});
  const items = $('.j_category  .item');
  for(let i = 0; i < items.length; i++){
    const item = $(items[i])
    const cagegorys = [item.find('.title a').text()];
    const links = item.find('.links a');

    for(let j = 0; j < links.length; j++){
      const link = $(links[j]);
      await getPages(link.attr('href'));
      break
    }
    break;
    // getPages()
  }
});

const getPages = async (url) => {
  return getHtml(url, 'utf-8').then(async data => {
    console.log(data)
    const pages = data.match(/page_count:\".*\"/);
    const $ = cheerio.load(data, {decodeEntities: false});
    console.log(111)
    console.log(pages)
    for(let i = 1; i<pages;i++){
      console.log(`${url}&page=${i}`)
      await getProducts(`${url}&page=${i}`)
    }
  })
};

const getProducts = async (url) => {
  return getHtml(url, 'utf-8').then(async data => {
    const $ = cheerio.load(data, {decodeEntities: false});
    const products = $('#J_goodsList .gl-item');

    for(let i = 0; i < products.length; i++){
      const product = $(products[i]);
      const url = product.find('.p-name a').attr('href');

      await getProduct(url);
      console.log(url);
      break;
    }
  })
};

const getProduct = async (url) => {
  return getHtml(url).then(data => {
    const $ = cheerio.load(data, {decodeEntities: false});
    const products = $('.product-intro');
    console.log(products.find('.sku-name').text())
  })
};
