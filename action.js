//定数
const URL                   = "https://api.gnavi.co.jp/RestSearchAPI/v3/?keyid={API_KEY}";
const ZOOM                  = 16;
const MSG_ERR_RANGE         = '*検索範囲を指定してください';
const MSG_ERR_PLACE_BLANK   = '*地名を入力してください';
const MSG_ERR_PLACE_ADDRESS = '*地点を特定できませんでした';
const MSG_ERR_STOREINFO     = '周辺の店舗情報が取得できませんでした';
const MSG_ERR_LOCINFO       = 'このブラウザでは位置情報が取得できません';

//グローバル変数
var json_gl;      //JSONデータ保持用
var map;          //マップ出力用
var marker;       //店舗情報出力用マーカー
var markerCurrent //現在地出力用マーカー
var markerArray = new google.maps.MVCArray(); //店舗情報出力用マーカー保持用
var currentInfo;  //マーカークリック時用
var infoWindowHv; //情報ウィンドウ用

//jquery
$(function(){
  //map読み込み
  initialize() ;

  // ぐるなびjsonファイルの読み込み
  $('#btnStoreSearch').on('click',function(){
    var range     = $('.select').val();
    var freeword  = $('#txtStoreSearch').val();
    var location  = $('#txtPlaceSearch').val();
    var latlng    = map.getCenter();

    //メッセージテキストクリア
    clearText();
    if($('.select').val() == ''){
      $('#errRange').text(MSG_ERR_RANGE);
      return;
    }
    //マーカ削除
    clearMarker(markerArray);
    //現在地マーカを配置
    setMarkerCurrent();

    $.ajax({
      url: URL
            +"&hit_per_page=100"
            +"&range="+range
            +"&latitude="+latlng.lat()
            +"&longitude="+latlng.lng()
            +"&freeword="+freeword,
      cache: false,
      dataType: 'json'
    })
    // 200 OK時
    .done(function(json) {
      json_gl = json;
      if(setMarker(json) == 0){
        $('.list_cnt').html("検索結果：0件");
        $('.list_store').html('');
        alert(MSG_ERR_STOREINFO);
      }
      $('.list_store').html(setList(json));
    })
    // HTTPエラー時
    .fail(function() {
      $('.list_cnt').html("検索結果：0件");
      $('.list_store').html('');
      alert(MSG_ERR_STOREINFO);
    });
  });

  // 現在地に戻る
  $('#btnCurrent').on('click',function(){
    //エラーメッセージ初期化
    clearText();
    //マップ初期化
    initialize();
  });

  // 場所を指定する
  $('#btnPlaceSearch').on('click',function(){
    //エラーメッセージ初期化
    clearText();

    //入力チェック
    if($('#txtPlaceSearch').val().match(/^[ 　\r\n\t]*$/)){
      $('#errPlace').text(MSG_ERR_PLACE_BLANK);
    }else{
      //マップ表示
      dispMapPlace($('#txtPlaceSearch').val());
    }
  });

  //検索結果にマウスをかざした場合の処理
  $('.list_store').on('mouseover','div[class^="entry-body-"]',function(){
      var className = $(this).attr('class');
      var dataId    = $(this).data('id');
      var marker;
      var pos;
      var lat;
      var lng;

      for (var k = 0; k < markerArray.getLength(); k++) {
        marker = markerArray.getAt(k);
        pos    = marker.getPosition();

        for (var i = 0; i < json_gl['rest'].length ; i++) {
          lat = json_gl['rest'][i]['latitude'];
          lng = json_gl['rest'][i]['longitude'];

          if(chkPostionNull(json_gl['rest'][i])){
            continue;
          }

          if(json_gl['rest'][i]['id'] != dataId){
            continue;
          }

          if(lat != pos.lat() && lng != pos.lng()){
            break;
          }

          if(!infoWindowHv){
            infoWindowHv = new google.maps.InfoWindow({
              content: createInfoWindow(json_gl['rest'][i]),
              maxWidth:500
            });

            infoWindowHv.open(map, marker);
          }
          break;
        }

        if(infoWindowHv){
          break;
        }
      }
  });

  $('.list_store').on('mouseout','div[class^="entry-body-"]',function(){
    if(infoWindowHv){
      infoWindowHv.close();
      infoWindowHv = null;
    }
  });
});

//マップ初期化
function initialize() {
  // 現在地取得
  navigator.geolocation.getCurrentPosition(success, fail);
}
//現在地が取得成功
function success(position) {
  createMap(position.coords.latitude,position.coords.longitude);
}
//現在地の取得失敗
function fail(fail){
  if(map == null){
    //東京駅を描画
    createMap('35.6804 ','139.769017');
  }
  alert(MSG_ERR_LOCINFO);
}
//マップ描画
function createMap(lat,lng){
  var pyrmont = new google.maps.LatLng(lat,lng);

  if(map != null){
    map.setOptions({
      center: pyrmont,
      zoom: ZOOM
    });
  }else{
    map = new google.maps.Map(document.getElementById('map'), {
      center: pyrmont,
      zoom: ZOOM
    });
  }
  // コントロールの表示オプション
  map.setOptions({
    mapTypeControl: false,
    fullscreenControl:false,
    streetViewControl: false
  });
  //現在位置用マーカーの編集
  setMarkerCurrent()
}

//マーカ配置
function setMarker(json){
  var currentLat;
  var currentLng;
  var pyrmont = new google.maps.LatLng(currentLat,currentLng);
  var content;
  var countResult = 0;   //検索結果件数用

  for (var i = 0; i < json['rest'].length ; i++) {
    if(chkPostionNull(json['rest'][i])){
      continue;
    }
    currentLat = json['rest'][i]['latitude'];
    currentLng = json['rest'][i]['longitude'];
    pyrmont = new google.maps.LatLng(currentLat,currentLng);
    marker = new google.maps.Marker({
      position: pyrmont,
      map: map,
      icon: {
        url: "img/marker.png",
        scaledSize: new google.maps.Size(30,35)
      }
    });

    content = createInfoWindow(json['rest'][i]);
    var infoWindow = new google.maps.InfoWindow({
        // disableAutoPan: true,
        content: content
    });

    //マーカイベントを作成
    addMarkerEvent(map,marker,infoWindow);
    //マーカーを格納
    markerArray.push(marker);

    countResult++;
  }
  return countResult;
}

function dispMapPlace(place){
  var geocoder = new google.maps.Geocoder();
  geocoder.geocode( { 'address': place}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      createMap(results[0].geometry.location.lat(),results[0].geometry.location.lng());
    } else {
      $('#errPlace').text(MSG_ERR_PLACE_ADDRESS);
    }
  });
}

//検索結果リスト作成
function setList(json){
  var list;
  var listAdd;
  var img;
  var countResult = 0;

  for (var i = 0; i < json['rest'].length ; i++) {
    var id        = json['rest'][i]['id'];
    var url       = json['rest'][i]['url'];
    var name      = json['rest'][i]['name'];
    var category  = json['rest'][i]['category'];
    var access;

    if(chkPostionNull(json['rest'][i])){
      continue;
    }
    if(json['rest'][i]['image_url']['shop_image1']){
      img = json['rest'][i]['image_url']['shop_image1'];
    }else{
      img = 'img/no_image.png';
    }

    if(json['rest'][i]['access']['line'] != ''){
      access = json['rest'][i]['access']['line']+
               json['rest'][i]['access']['station']+'：'+
               json['rest'][i]['access']['walk']+'分';
    }else{
      access = '−−−';
    }

    list =  '<div class="entry-body-'+id+'" '+'data-id="'+id+'">'+
              '<img class="shop_img" src="'+img+'">'+
              '<div class="item-info">'+
                '<div class="item-title">'+
                '<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+name+'</a></div>'+
                '<div class="item-category">'+category+'</div>'+
                '<div class="item-access">'+access+'</div>'+
              '</div>'+
            '</div>';
    if(listAdd){
      listAdd = listAdd + list;
    }else{
      listAdd = list;
    }
    countResult++;
  }
  $('.list_cnt').html("検索結果："+countResult+"件");
  return listAdd;
}

//マーカイベント作成
function addMarkerEvent(map,marker,infoWindow){
  google.maps.event.addListener(marker,'click', function(e) {
    if(currentInfo){
      currentInfo.close();
    }
    infoWindow.open(map, marker);
    currentInfo = infoWindow;
  });
}

//InfoWindowテキスト作成
function createInfoWindow(json){
  var content;
  var img       = json['image_url']['shop_image1'];
  var url       = json['url'];
  var name      = json['name'];
  var category  = json['category'];
  var tel       = json['tel'];
  var address   = json['address'];
  var access    = json['access']['line']+
                  json['access']['station']+'：'+
                  json['access']['walk'];
  var opentime  = json['opentime'].replace(/\r?\n/g, '<br />');
  var holiday   = json['holiday'].replace(/\r?\n/g, '<br />');

  //情報未掲載時の処理
  if(img == ''){img = 'img/no_image.png';}
  if(tel == ''){tel = '---';}
  if(address == ''){address = '---';}
  if(opentime == ''){opentime = '---';}
  if(holiday == ''){holiday = '---';}
  if(access != '：'){
    access = access+'分';
  }else{
    access = '−−−';
  }

  content = '<div class="infoWindow-body">'+
              '<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+
              '<img class="shop_img_w" src="'+img+'"></a>'+
              '<div class="item-info_w">'+
                '<div class="item-title_w">'+
                '<a href="'+url+'" target=”_blank”>'+name+'</a></div>'+
                '<div class="item-category_w">'+category+'</div>'+
                '<div class="item-tel_w"><div class="tel_w">[ TEL ]</div>'+tel+'</div>'+
                '<div class="item-address_w"><div class="address_w">[ 住所 ]</div>'+address+'</div>'+
                '<div class="item-access_w"><div class="access_w">[ アクセス ]</div>'+access+'</div>'+
                '<div class="item-opentime_w"><div class="opentime_w">[ 営業時間 ]</div>'+opentime+'</div>'+
                '<div class="item-holiday_w"><div class="holiday_w">[ 定休日 ]</div>'+holiday+'</div>'+
              '</div>'+
            '</div>';

  return content;
}

//緯度経度存在チェック
function chkPostionNull(json){
  if(json['latitude'] == "" || json['longitude'] == ""){
    return true;
  }else{
    return false;
  }
}
//現在地マーカ配置
function setMarkerCurrent(){
  if(markerCurrent != null){
    markerCurrent.setMap(null);
    markerCurrent = null;
  }
  markerCurrent = new google.maps.Marker({
    position: map.getCenter(),
    map: map,
    icon: {
      url: "img/man.png",
      scaledSize: new google.maps.Size(45,50)
    }
  });
}
//マーカ削除
function clearMarker(markerArray){
  markerArray.forEach(function(marker,index){
    marker.setMap(null);
    marker = null;
  });
}
//エラーメッセージテキストクリア
function clearText(){
  $('#errPlace').text('');
  $('#errRange').text('');
}
