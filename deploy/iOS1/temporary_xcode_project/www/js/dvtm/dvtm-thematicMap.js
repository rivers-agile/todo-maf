/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/layer/AreaDataLayerRenderer.js
 */
(function()
{
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var AreaDataLayerRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaDataLayerRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.AreaDataLayerRenderer');

  AreaDataLayerRenderer.prototype.ProcessAttributes = function (options, areaDataLayerNode, context)
  {
    var amxNode = context['amxNode'];
    if (areaDataLayerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(areaDataLayerNode.getAttribute('rendered')))
      return;

    if (!areaDataLayerNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
    }

    var dataLayer = {};

    var areaLayerNode = areaDataLayerNode.getParent();

    dataLayer['associatedLayer'] = areaLayerNode.getAttribute('layer');
    var layerOptions = null;
    for (var i = 0; i < options['areaLayers'].length; i++) 
    {
      if (options['areaLayers'][i]['layer'] === dataLayer['associatedLayer']) 
      {
        layerOptions = options['areaLayers'][i];
        break;
      }
    }

    if (layerOptions === null)
    {
      throw new adf.mf.internal.dvt.exception.DvtmException('Area layer "' + areaLayerNode.getAttribute('layer') + '" was not found!');
    }
    if (areaDataLayerNode.getId() !== undefined)
      dataLayer['id'] = areaDataLayerNode.getId();

    if (areaDataLayerNode.isAttributeDefined('animationDuration'))
      dataLayer['animationDuration'] = areaDataLayerNode.getAttribute('animationDuration');

    if (areaDataLayerNode.isAttributeDefined('animationOnDataChange'))
      dataLayer['animationOnDataChange'] = areaDataLayerNode.getAttribute('animationOnDataChange');

    if (areaDataLayerNode.isAttributeDefined('disclosedItems'))
      dataLayer['disclosedItems'] = areaDataLayerNode.getAttribute('disclosedItems');

    if (areaDataLayerNode.isAttributeDefined('isolatedRowKey'))
      dataLayer['isolatedItem'] = areaDataLayerNode.getAttribute('isolatedRowKey');

    var prevSelection = amxNode.getAttribute('__userselection') ? amxNode.getAttribute('__userselection')[areaDataLayerNode.getId()] : null;
    if (prevSelection)
    {
      dataLayer['selection'] = prevSelection;
    }
    else if (areaDataLayerNode.isAttributeDefined('selectedRowKeys'))
    {  
      dataLayer['selection'] = AttributeProcessor['ROWKEYARRAY'](areaDataLayerNode.getAttribute('selectedRowKeys'));
      var userSelection = amxNode.getAttribute('__userselection') || {};
      userSelection[areaDataLayerNode.getId()] = dataLayer['selection'];
      amxNode.setAttributeResolvedValue('__userselection', userSelection);
    }
    if (areaDataLayerNode.isAttributeDefined('dataSelection'))
      dataLayer['selectionMode'] = areaDataLayerNode.getAttribute('dataSelection');

    if (areaDataLayerNode.isAttributeDefined('emptyText'))
      dataLayer['emptyText'] = areaDataLayerNode.getAttribute('emptyText');

    AttributeGroupManager.init(context);
    
    // process stamped children
    dataLayer['areas'] = [];
    dataLayer['markers'] = [];
    
    // amxNode.value is the array of "stamps"
    var value = areaDataLayerNode.getAttribute('value');
    if(value)
    {
      // collection is available so iterate through data and process each areaLocation
      var iter = adf.mf.api.amx.createIterator(value);
      while (iter.hasNext())
      {
        var stamp = iter.next();
        var children = areaDataLayerNode.getChildren(null, iter.getRowKey());     
        // iteration through all child elements
        var iter2 = adf.mf.api.amx.createIterator(children);
        while (iter2.hasNext())
        {
          var areaLocNode = iter2.next();
          var rowKey = iter.getRowKey();
          // process each location node
          adf.mf.internal.dvt.processAreaLocation.call(this, amxNode, dataLayer, areaLocNode, rowKey, context);
        }
      }
    }
    else
    {
      // collection does not exist so iterate only through child tags
      // and resolve them without var context variable
      var tagChildren = areaDataLayerNode.getChildren();
      var tagIterator = adf.mf.api.amx.createIterator(tagChildren);
      while (tagIterator.hasNext())
      {
        var tagAreaLocNode = tagIterator.next();
        var tagAreaRowKey = "" + (tagIterator.getRowKey() + 1);
        // process each location node
        adf.mf.internal.dvt.processAreaLocation.call(this, amxNode, dataLayer, tagAreaLocNode, tagAreaRowKey, context);
      }
    }
    layerOptions['areaDataLayer'] = dataLayer;
    
    AttributeGroupManager.applyAttributeGroups(amxNode, null, context);
    
    return false;
  }

  AreaDataLayerRenderer.prototype.ProcessChildren = function (options, areaDataLayerNode, context)
  {
    if (areaDataLayerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(areaDataLayerNode.getAttribute('rendered')))
      return;

    return AreaDataLayerRenderer.superclass.ProcessChildren.call(this, options, areaDataLayerNode, context);
  }

  adf.mf.internal.dvt.processAreaLocation = function(amxNode, dataLayer, areaLocNode, rowKey, context)
  {
    if (areaLocNode.getTag().getName() !== 'areaLocation')
      return;

    if (!areaLocNode.isAttributeDefined('rendered') || adf.mf.api.amx.isValueTrue(areaLocNode.getAttribute('rendered')))
    {
      var areaLocChildren = areaLocNode.getChildren();
      for (var i=0; i<areaLocChildren.length; i++) {
        var childData = {};
        childData['location'] = areaLocNode.getAttribute('name');
        //childData['type'] = areaLocChildren[i].getTag().getName()
        childData['id'] = rowKey;
        adf.mf.internal.dvt.processThematicMapDataItem.call(this, amxNode, childData, areaLocChildren[i], context);
        if (areaLocChildren[i].getTag().getName() === 'area') {
          dataLayer['areas'].push(childData);
        } else 
        {
          dataLayer['markers'].push(childData);
        }
      }
    }
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/layer/AreaLayerRenderer.js
 */
(function(){

  var AreaLayerRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaLayerRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.AreaLayerRenderer');

  /**
   * processes the components's child tags
   */
  AreaLayerRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      this._renderers =
        {
          'areaDataLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.AreaDataLayerRenderer() },
          // deprecated case
          'pointDataLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.PointDataLayerRenderer() }
        };
    }

    return this._renderers;
  }

  AreaLayerRenderer.prototype.ProcessAttributes = function (options, layerNode, context)
  {
    var amxNode = context['amxNode'];
    if (layerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(layerNode.getAttribute('rendered')))
      return;

    if (!layerNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
    }

    adf.mf.internal.dvt.setThematicMapLayerProperties.call(this, 'area', amxNode, layerNode);
    return true;
  }

  AreaLayerRenderer.prototype.ProcessChildren = function (options, layerNode, context)
  {
    if (layerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(layerNode.getAttribute('rendered')))
      return;

    return AreaLayerRenderer.superclass.ProcessChildren.call(this, options, layerNode, context);
  }

   /**
   * Sets the thematic map properties found on the amxNode
   */
  adf.mf.internal.dvt.setThematicMapLayerProperties = function(type, amxNode, layerNode)
  {
    var options = this.GetDataObject(amxNode);
    if (!options['areaLayers'])
      options['areaLayers'] = [];
    var layer = {'labelDisplay': 'auto', 'labelType': 'short'};
    this.SetOptionsDirty(amxNode, true);

    if (layerNode.isAttributeDefined('layer'))
    {
      layer['layer'] = layerNode.getAttribute('layer');
      // load resource and base map layer
      if (!options['source'])
        adf.mf.internal.dvt.loadMapLayerAndResource.call(this, amxNode, options['basemap'], layer['layer']);
    }
    else
    {
      layer['layer'] = 'cities';
      layer['type'] = 'point';
      return;
    }

//    if (type)
//      layer['type'] = type;
    if (layerNode.isAttributeDefined('areaLabelDisplay'))
      layer['labelDisplay'] = layerNode.getAttribute('areaLabelDisplay');

    if (layerNode.isAttributeDefined('labelStyle'))
      layer['labelStyle'] = layerNode.getAttribute('labelStyle');

    if (layerNode.isAttributeDefined('labelType'))
      layer['labelType'] = layerNode.getAttribute('labelType');

//    if (layerNode.isAttributeDefined('animationDuration'))
//      layer['animationDuration'] = layerNode.getAttribute('animationDuration');

    if (layerNode.isAttributeDefined('animationOnLayerChange'))
      layer['animationOnLayerChange'] = layerNode.getAttribute('animationOnLayerChange');

    if (layerNode.isAttributeDefined('areaStyle'))
      layer['areaStyle'] = layerNode.getAttribute('areaStyle');
      
    options['areaLayers'].push(layer);
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/layer/AreaLayerRendererDT.js
 */
(function(){
  
  var AreaLayerRendererDT = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaLayerRendererDT, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.AreaLayerRendererDT');
  
  AreaLayerRendererDT.prototype.ProcessAttributes = function (options, layerNode, context)
  {
    var layer = {};
    
    layer['type'] = "area";    
    layer['layer'] = 'continents'; 
    if(layerNode)
    {
      layer['layer'] = this._nullIfEl(layerNode.getAttribute('layer'));
    }    
    if(!layer['layer'])
    {
      layer['layer'] = this._getDTModeTopLayer(options['basemap']);
    }
    
    if (!options['areaLayers'])
    {
      options['areaLayers'] = [];
    }
  
    // load resource and base map layer 
    adf.mf.internal.dvt.loadMapLayerAndResource.call(this, null, options['basemap'], layer['layer']); 
    options['areaLayers'].push(layer);
    return false;
  }    
    
  /**
   * functions check if value is EL expression. If so then it returns
   * null value.
   */
  AreaLayerRendererDT.prototype._nullIfEl = function(value)
  {
    if(!value || value == null || value.indexOf("#{") > -1) 
    {
      return null;
    }
    return value;
  }
  
  /**
   * function determines default top layer for given basemap.
   */
  AreaLayerRendererDT.prototype._getDTModeTopLayer = function(baseMap)
  {  
    var topLayer = adf.mf.internal.dvt.thematicmap.THEMATICMAP_DEFAULT_TOP_LAYER_MAPPING[baseMap];
    if(topLayer) 
    {
       return topLayer;
    }
    return null;    
  }
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/layer/AreaLocationRenderer.js
 */
(function(){
  
  var AreaLocationRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaLocationRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.AreaLocationRenderer');
  
  AreaLocationRenderer.prototype.ProcessAttributes = function (options, legendNode, context)
  {
    return false;
  }  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/layer/PointDataLayerRenderer.js
 */
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var PointDataLayerRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(PointDataLayerRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.PointDataLayerRenderer');

  PointDataLayerRenderer.prototype.ProcessAttributes = function (options, pointDataLayerNode, context)
  {
    var amxNode = context['amxNode'];
    if (pointDataLayerNode.isAttributeDefined('rendered')
        && adf.mf.api.amx.isValueFalse(pointDataLayerNode.getAttribute('rendered')))
      return false;

    if (!pointDataLayerNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
    }

    var loadCityLayer = false;
    var dataLayer = {};

    var parentNode = pointDataLayerNode.getParent();
    var layerOptions = null;
    if(parentNode.getTag().getName() === 'areaLayer')
    {
      dataLayer['associatedWith'] = parentNode.getAttribute('layer');
      for (var i = 0; i < options['areaLayers'].length; i++) 
      {
        if (options['areaLayers'][i]['layer'] === dataLayer['associatedWith']) 
        {
          layerOptions = options['areaLayers'][i];
          break;
        }
      }
      if (layerOptions === null)
      {
        throw new adf.mf.internal.dvt.exception.DvtmException('Area layer "' + areaLayerNode.getAttribute('layer') + '" was not found!');
      }
    }
    else
    {
      layerOptions = options;
      adf.mf.internal.dvt.setThematicMapLayerProperties.call(this, 'point', amxNode, pointDataLayerNode);
    }
    dataLayer['associatedLayer'] = 'cities';

    if (pointDataLayerNode.getId() !== undefined)
      dataLayer['id'] = pointDataLayerNode.getId();

    if (pointDataLayerNode.isAttributeDefined('animationDuration'))
      dataLayer['animationDuration'] = pointDataLayerNode.getAttribute('animationDuration');

    if (pointDataLayerNode.isAttributeDefined('animationOnDataChange'))
      dataLayer['animationOnDataChange'] = pointDataLayerNode.getAttribute('animationOnDataChange');

    var prevSelection = amxNode.getAttribute('__userselection') ? amxNode.getAttribute('__userselection')[pointDataLayerNode.getId()] : null;
    if (prevSelection)
    {
      dataLayer['selection'] = prevSelection;
    }
    else if (pointDataLayerNode.isAttributeDefined('selectedRowKeys'))
    {  
      dataLayer['selection'] = AttributeProcessor['ROWKEYARRAY'](pointDataLayerNode.getAttribute('selectedRowKeys'));
      var userSelection = amxNode.getAttribute('__userselection') || {};
      userSelection[pointDataLayerNode.getId()] = dataLayer['selection'];
      amxNode.setAttributeResolvedValue('__userselection', userSelection);
    }
    if (pointDataLayerNode.isAttributeDefined('dataSelection'))
    {
      dataLayer['selectionMode'] = pointDataLayerNode.getAttribute('dataSelection');
    }

    if (pointDataLayerNode.isAttributeDefined('emptyText'))
      dataLayer['emptyText'] = pointDataLayerNode.getAttribute('emptyText');

    AttributeGroupManager.init(context);
    
    // process stamped children
    var varName = pointDataLayerNode.getAttribute("var");
    dataLayer['markers'] = [];
    // amxNode.value is the array of "stamps"
    var value = pointDataLayerNode.getAttribute('value');
    if(value)
    {
      // collection is available so iterate through data and process each pointLocation
      var iter = adf.mf.api.amx.createIterator(value);
      while (iter.hasNext()) {
        var stamp = iter.next();
        var children = pointDataLayerNode.getChildren(null, iter.getRowKey());      
        // iteration through all child elements
        var iter2 = adf.mf.api.amx.createIterator(children);
        while (iter2.hasNext()) {
          var pointLocNode = iter2.next();
          var rowKey = iter.getRowKey();
          // process each location node
          loadCityLayer = loadCityLayer | adf.mf.internal.dvt._processPointLocationNode.call(this, amxNode, dataLayer, pointLocNode, rowKey, context)
        }
      }
    }
    else
    {
      // collection does not exist so iterate only through child tags
      // and resolve them without var context variable
      var tagChildren = pointDataLayerNode.getChildren();
      var tagChildrenIterator = adf.mf.api.amx.createIterator(tagChildren);

      while (tagChildrenIterator.hasNext()) {
        var tagPointLocNode = tagChildrenIterator.next();
        var tagChildrenRowKey = "" + (tagChildrenIterator.getRowKey() + 1);
        // process each location node
        loadCityLayer = loadCityLayer | adf.mf.internal.dvt._processPointLocationNode.call(this, amxNode, dataLayer, tagPointLocNode, tagChildrenRowKey, context)
      }
    }
    /**
     * Following will add layer either in options root or in areaLayers.
     * It depends on where pointDataLayers are placed in AMX!
     */
    if (!layerOptions['pointDataLayers'])
    {
      layerOptions['pointDataLayers'] = [];
    }
    layerOptions['pointDataLayers'].push(dataLayer);    

    // load resource and base map layer
    if (!options['source'] && loadCityLayer)
      adf.mf.internal.dvt.loadMapLayerAndResource.call(this, amxNode, options['basemap'], 'cities');

    AttributeGroupManager.applyAttributeGroups(amxNode, null, context);
      
    return true;
  }

  PointDataLayerRenderer.prototype.ProcessChildren = function (options, dataLayer, context)
  {
    if (dataLayer.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(dataLayer.getAttribute('rendered')))
      return;

    return PointDataLayerRenderer.superclass.ProcessChildren.call(this, options, dataLayer, context);
  }

  adf.mf.internal.dvt._processPointLocationNode = function(amxNode, dataLayer, pointLocNode, rowKey, context)
  {
    var loadCityLayer = false;
    if (pointLocNode.getTag().getName() !== 'pointLocation')
      return loadCityLayer;
    if (!pointLocNode.isAttributeDefined('rendered') || adf.mf.api.amx.isValueTrue(pointLocNode.getAttribute('rendered')))
    {
      var markerNodes = pointLocNode.getChildren();
      if (markerNodes.length > 0) {
        var markerData = {};
        if (pointLocNode.isAttributeDefined('pointName'))
        {
          loadCityLayer = true;
          markerData['location'] = pointLocNode.getAttribute('pointName');
        }
        else if (pointLocNode.isAttributeDefined('pointX') && pointLocNode.isAttributeDefined('pointY'))
        {
          markerData['x'] = pointLocNode.getAttribute('pointX');
          markerData['y'] = pointLocNode.getAttribute('pointY');
        }
        markerData['type'] = 'marker';
        markerData['id'] = rowKey;
        adf.mf.internal.dvt.processThematicMapDataItem.call(this, amxNode, markerData, markerNodes[0], context);
        dataLayer['markers'].push(markerData);
      }
    }
    return loadCityLayer;
  }


})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/layer/PointLocationRenderer.js
 */
(function(){
  
  var PointLocationRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(PointLocationRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.PointLocationRenderer');
  
  PointLocationRenderer.prototype.ProcessAttributes = function (options, legendNode, context)
  {
    
  }  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    common/layer/ThematicMapDataItemRenderer.js
 */
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  
  var ThematicMapDataItemRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ThematicMapDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.ThematicMapDataItemRenderer');
  
 
  ThematicMapDataItemRenderer.prototype.ProcessAttributes = function (options, legendNode, context)
  {
    return false;
  }  
  
  adf.mf.internal.dvt.processThematicMapDataItem = function(amxNode, data, dataNode, context) 
  {
    var options = this.GetDataObject(amxNode);
  
    //First check if this data item should be rendered at all
    if (dataNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(dataNode.getAttribute('rendered')))
      return null;
      
    // process attribute groups, if any
    data['attrGroups'] = [];
    var attributeGroupsNodes = dataNode.getChildren();
    var iter = adf.mf.api.amx.createIterator(attributeGroupsNodes);
    while (iter.hasNext()) {
      var attributeGroupsNode = iter.next();
      AttributeGroupManager.processAttributeGroup(attributeGroupsNode, amxNode, context);
    }
    
    if (dataNode.isAttributeDefined('source'))
      data['source'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('source'));
    
    if (dataNode.isAttributeDefined('sourceHover'))
      data['sourceHover'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceHover'));
      
    if (dataNode.isAttributeDefined('sourceSelected'))
      data['sourceSelected'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceSelected'));
      
    if (dataNode.isAttributeDefined('sourceHoverSelected'))
      data['sourceHoverSelected'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceHoverSelected'));
    
    if (dataNode.isAttributeDefined('gradientEffect'))
      data['gradientEffect'] = dataNode.getAttribute('gradientEffect');
    
    if (dataNode.isAttributeDefined('opacity'))
      data['opacity'] = +dataNode.getAttribute('opacity');

    if (dataNode.isAttributeDefined('borderStyle'))
      data['borderStyle'] = dataNode.getAttribute('borderStyle');
    
    if (dataNode.isAttributeDefined('borderColor'))
      data['borderColor'] = dataNode.getAttribute('borderColor');

    if (dataNode.isAttributeDefined('borderWidth'))
    {
      data['borderWidth'] = dataNode.getAttribute('borderWidth');
      if (!isNaN(data['borderWidth']))
      {
        if ((data['borderWidth'] > 0) && !dataNode.isAttributeDefined('borderStyle')) 
        {
          data['borderStyle'] = 'solid';
        }
      }
    }
 
    if (dataNode.isAttributeDefined('shortDesc'))
      data['shortDesc'] = dataNode.getAttribute('shortDesc');
    
    if (dataNode.getAttribute('labelDisplay') === 'on')
    {
      if (dataNode.isAttributeDefined('value'))
        data['label'] = dataNode.getAttribute('value');

      if (dataNode.isAttributeDefined('labelPosition'))
        data['labelPosition'] = dataNode.getAttribute('labelPosition');

      if (dataNode.isAttributeDefined('labelStyle'))
        data['labelStyle'] = dataNode.getAttribute('labelStyle');
    }

    if (dataNode.isAttributeDefined('rotation'))
      data['rotation'] = dataNode.getAttribute('rotation');
      
    if (dataNode.isAttributeDefined('width'))
      data['width'] = dataNode.getAttribute('width');
   
    if (dataNode.isAttributeDefined('height'))
      data['height'] = dataNode.getAttribute('height');
      
    if (dataNode.isAttributeDefined('scaleX'))
      data['scaleX'] = +dataNode.getAttribute('scaleX');
 
    if (dataNode.isAttributeDefined('scaleY'))
      data['scaleY'] = +dataNode.getAttribute('scaleY');    

    if (dataNode.isAttributeDefined('fillColor') && dataNode.getAttribute('fillColor')) {
      data['color'] = dataNode.getAttribute('fillColor');
    }

    if (dataNode.isAttributeDefined('fillPattern'))
      data['pattern'] = dataNode.getAttribute('fillPattern');
      
    if (dataNode.isAttributeDefined('shape'))
      data['shape'] = dataNode.getAttribute('shape');

    data['clientId'] = dataNode.getId();
    
    if (dataNode.isAttributeDefined('action')) 
    {
      data['action'] = data['id'];
    }
    else 
    {
      var firesAction = false;
      var actionTags;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags  
      actionTags = dataNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else 
      {
        actionTags = dataNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction) 
      {
        // need to set 'action' to some value to make the event fire
        data['action'] = data['id'];
      }
    }
    
    var config = new adf.mf.internal.dvt.common.attributeGroup.DataItemConfig();
    
    var shape = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver.SHAPE;
    if (data['type'] === 'marker' &&  !dataNode.isAttributeDefined(shape)) {
      // old markerStyle.type was replaced by new keys: styleDefaults.dataMarkerDefaults.shape
      config.addTypeDefaultValue(shape, options['styleDefaults']['dataMarkerDefaults']['shape']);
    }

    AttributeGroupManager.registerDataItem(context, data, config);    
  }
  
})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    thematicMap/ThematicMapDefaults.js
 */
(function(){

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.thematicmap');
  
  adf.mf.internal.dvt.thematicmap.DefaultThematicMapStyle = 
  {
    // marker properties
    'marker': 
    {
      // separator upper color
      'scaleX': 1.0,
      // separator lower color
      'scaleY': 1.0,
      // should display title separator
      'type': 'circle'
    },

    // thematic map legend properties
    'legend': 
    {
      // legend position none / auto / start / end / top / bottom
      'position': "auto",
      'rendered': true
    },
    
    // default style values - WILL BE DELETED AND NOT PASSED TO TOOLKIT
    'styleDefaults': {
      // default color palette
      'colors': ["#003366", "#CC3300", "#666699", "#006666", "#FF9900", "#993366", "#99CC33", "#624390", "#669933",
                 "#FFCC33", "#006699", "#EBEA79"],               
      // default marker shapes
      'shapes' : [ 'circle', 'square', 'plus', 'diamond', 'triangleUp', 'triangleDown', 'human']
    }
  };
  
  adf.mf.internal.dvt.thematicmap.DefaultThematicMapStyleAlta = 
  {
    // marker properties
    'marker': 
    {
      // separator upper color
      'scaleX': 1.0,
      // separator lower color
      'scaleY': 1.0,
      // should display title separator
      'type': 'circle'
    },

    // thematic map legend properties
    'legend': 
    {
      // legend position none / auto / start / end / top / bottom
      'position': "auto",
      'rendered': true
    },
    
    // default style values - WILL BE DELETED AND NOT PASSED TO TOOLKIT
    'styleDefaults': {
      // default color palette
      'colors': ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
      // default marker shapes
      'shapes' : [ 'circle', 'square', 'plus', 'diamond', 'triangleUp', 'triangleDown', 'human']
    }
  };
  /**
   * contains information about top layer for each basemap
   */
  adf.mf.internal.dvt.thematicmap.THEMATICMAP_DEFAULT_TOP_LAYER_MAPPING = 
  {
    'world' : 'continents', 
    'worldRegions' : 'regions', 
    'usa' : 'country', 
    'africa' : 'continent', 
    'asia' : 'continent', 
    'australia' : 'continent', 
    'europe' : 'continent', 
    'northAmerica' : 'continent', 
    'southAmerica' : 'continent', 
    'apac' : 'region', 
    'emea' : 'region', 
    'latinAmerica' : 'region', 
    'usaAndCanada' : 'region'
  };


})();
/* Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved. */
/*
 *    thematicMap/ThematicMapRenderer.js
 */
(function()
{
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var DOMUtils = adf.mf.internal.dvt.DOMUtils;

  var loadedCustomBasemaps = {};

  var ThematicMapRenderer = function ()
  { };

  adf.mf.internal.dvt.DvtmObject.createSubclass(ThematicMapRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.thematicmap.ThematicMapRenderer');
  
  ThematicMapRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    if ((amxNode.isAttributeDefined('zooming') && amxNode.isAttributeDefined('zooming') !== 'none')
     || (amxNode.isAttributeDefined('panning') && amxNode.isAttributeDefined('panning') !== 'none'))
    {
      return true;
    }
    return false;
  };

  ThematicMapRenderer.prototype.__isReadyToRender = function(amxNode)
  {
    var ready = true;
    if (amxNode.getAttribute("_baseMap") === "loading")
    {
      return false;
    }

    amxNode.visitChildren(new adf.mf.api.amx.VisitContext(), function (visitContext, anode)
    {
      if (anode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(anode.getAttribute('rendered')))
      {
        return adf.mf.api.amx.VisitResult['REJECT'];
      }

      if (anode.getTag().getName() === "pointDataLayer" || anode.getTag().getName() === "areaDataLayer")
      {
        if (anode.isAttributeDefined("value"))
        {
          var items = anode.getAttribute("value");
          if (items === undefined)
          {
            ready = false;
            return adf.mf.api.amx.VisitResult['COMPLETE'];
          }

          if (items && items.treeNodeBindings)
          {
            var iter = adf.mf.api.amx.createIterator(items);
            if (iter.getTotalCount() > iter.getAvailableCount())
            {
              ready = false;
              return adf.mf.api.amx.VisitResult['COMPLETE'];
            }
          }
        }

        return adf.mf.api.amx.VisitResult['REJECT'];
      }

      return adf.mf.api.amx.VisitResult['ACCEPT'];
    });

    return ready;
  };

  ThematicMapRenderer.prototype.render = function (amxNode, id)
  {
    var rootElement = ThematicMapRenderer.superclass.render.call(this, amxNode, id);

    if (this.__isReadyToRender(amxNode) === false)
    {
      var placeholder = document.createElement("div");
      placeholder.id = id + "_placeholder";
      placeholder.className = "dvtm-component-placeholder amx-deferred-loading";
      var msgLoading = adf.mf.resource.getInfoString("AMXInfoBundle", "MSG_LOADING");
      placeholder.setAttribute("aria-label", msgLoading);
      rootElement.appendChild(placeholder);
    }

    return rootElement;
  };

  ThematicMapRenderer.prototype.attributeChangeResult = function (amxNode, attributeName, attributeChanges)
  {
    return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];;
  };

  ThematicMapRenderer.prototype.getDescendentChangeAction = function (amxNode, changes)
  {
    return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
  };

  ThematicMapRenderer.prototype.postDisplay = function (rootElement, amxNode)
  {
    if (this.__isReadyToRender(amxNode) === false)
    {
      if (this.IsAncestor(document.body, rootElement))
      {
        this.GetComponentDimensions(rootElement, amxNode);
      }
      return; // this function is not applicable for placeholders
    }

    var placeholder = document.getElementById(amxNode.getId() + "_placeholder");
    if (placeholder)
    {
      placeholder.parentNode.removeChild(placeholder);
    }

    ThematicMapRenderer.superclass.postDisplay.call(this, rootElement, amxNode);
  };

  ThematicMapRenderer.prototype.RefreshComponent = function (amxNode, attributeChanges, descendentChanges)
  {
    ThematicMapRenderer.superclass.RefreshComponent.call(this, amxNode, attributeChanges, descendentChanges);

    if (this.__isReadyToRender(amxNode) === false)
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
    }

    var placeholder = document.getElementById(amxNode.getId() + "_placeholder");
    if (placeholder)
    {
      placeholder.parentNode.removeChild(placeholder);
    }

    /* BUG 17458279: Check if we have some descendent changes available. If so, then use them and drop them. */
    if ((descendentChanges === undefined) && (amxNode["_pendingDescendentChanges"] !== undefined))
    {
      descendentChanges = amxNode["_pendingDescendentChanges"];
    }
    delete amxNode["_pendingDescendentChanges"];
    // recover all the information about attribute changes before bulkLoadProvider
    if (amxNode["_pendingAttributeChanges"])
    {
      attributeChanges = amxNode["_pendingAttributeChanges"];
      delete amxNode["_pendingAttributeChanges"];
    }
  };

  /**
   * processes the components's child tags
   */
  ThematicMapRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if (this._renderers === undefined)
    {
      if (adf.mf.environment.profile.dtMode)
      {
        this._renderers =
          {
            'areaLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.AreaLayerRendererDT() }
          };
      }
      else
      {
        this._renderers =
          {
            'areaLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.AreaLayerRenderer(), 'order' : 1 },
            'pointDataLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.PointDataLayerRenderer(), 'order' : 2 },
            'legend' : { 'renderer' : new LegendRenderer(), 'order' : 3, 'maxOccurrences' : 1 }
          };
      }
    }
    return this._renderers;
  };

  ThematicMapRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ThematicMapRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['animationDuration'] = {'path' : 'animationDuration', 'type' : AttributeProcessor['INTEGER'], 'default' : 1000};
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['animationOnMapChange'] = {'path' : 'animationOnMapChange', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['initialZooming'] = {'path' : 'initialZooming', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['markerZoomBehavior'] = {'path' : 'markerZoomBehavior', 'type' : AttributeProcessor['TEXT'], 'default' : 'fixed'};
    attrs['zooming'] = {'path' : 'zooming', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['panning'] = {'path' : 'panning', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['basemap'] = {'path' : 'basemap', 'type' : AttributeProcessor['TEXT'], 'default' : 'world'};
    attrs['tooltipDisplay'] = {'path' : 'tooltipDisplay', 'type' : AttributeProcessor['TEXT'], 'default' : 'auto'};

    return attrs;
  };

  /**
   * @return object that describes styleClasses of the component.
   */
  ThematicMapRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = ThematicMapRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['dvtm-area'] = {'path' : 'styleDefaults/areaStyle', 'type' : [StyleProcessor['CSS_TEXT'], StyleProcessor['CSS_BACK']]};
    styleClasses['_self'] = {'path' : 'styleDefaults/background-color', 'type' : StyleProcessor['BACKGROUND']};
    styleClasses['dvtm-areaLayer'] = {'path' : 'styleDefaults/dataAreaDefaults/borderColor', 'type' : StyleProcessor['BORDER_COLOR']};
    styleClasses['dvtm-areaHover'] = {'path' : 'styleDefaults/dataAreaDefaults/hoverColor', 'type' : StyleProcessor['BORDER_COLOR']};
    styleClasses['dvtm-areaSelected'] = [{'path' : 'styleDefaults/dataAreaDefaults/selectedInnerColor', 'type' : StyleProcessor['BORDER_COLOR_TOP']}, {'path' : 'styleDefaults/dataAreaDefaults/selectedOuterColor', 'type' : StyleProcessor['BORDER_COLOR']}];

    styleClasses['dvtm-legend'] = [{'path' : 'legend/textStyle', 'type' : StyleProcessor['CSS_TEXT']}, {'path' : 'legend/backgroundColor', 'type' : StyleProcessor['BACKGROUND']}, {'path' : 'legend/borderColor', 'type' : StyleProcessor['TOP_BORDER_WHEN_WIDTH_GT_0PX']}];
    styleClasses['dvtm-legendTitle'] = {'path' : 'legend/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-legendSectionTitle'] = {'path' : 'legend/sectionTitleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-marker'] = [
      {'path' : 'styleDefaults/dataMarkerDefaults/labelStyle', 'type' : StyleProcessor['CSS_TEXT']},
      {'path' : 'styleDefaults/dataMarkerDefaults/color', 'type' : StyleProcessor['BACKGROUND']},
      {'path' : 'styleDefaults/dataMarkerDefaults/opacity', 'type' : StyleProcessor['OPACITY']},
      {'path' : 'styleDefaults/dataMarkerDefaults/borderStyle', 'type' : StyleProcessor['BORDER_STYLE']},
      {'path' : 'styleDefaults/dataMarkerDefaults/borderColor', 'type' : StyleProcessor['BORDER_COLOR']},
      {'path' : 'styleDefaults/dataMarkerDefaults/borderWidth', 'type' : StyleProcessor['BOTTOM_BORDER_WIDTH']}
    ];

    return styleClasses;
  };

  ThematicMapRenderer.prototype.InitComponentOptions = function (amxNode, options)
  {
    ThematicMapRenderer.superclass.InitComponentOptions.call(this, amxNode, options);

    AttributeGroupManager.reset(amxNode);
    amxNode['_stylesResolved'] = false;
    amxNode.setAttributeResolvedValue('__userselection', null);
   
    options['animationDuration'] = 1000;
    options['animationOnDisplay'] = 'none';
    options['animationOnMapChange'] = 'none';
    options['areaLayers'] = [];
    options['basemap'] = {};
    options['initialZooming'] = 'none';
    options['markerZoomBehavior'] = 'fixed';
    options['panning'] = 'none';
    options['pointDataLayers'] = [];
    options['styleDefaults'] = 
    {
      'dataAreaDefaults' : {},
      'dataMarkerDefaults' : {}
    };
    options['tooltipDisplay'] = 'auto';
    options['zooming'] = 'none';
    options['legend'] = {};
  };

  ThematicMapRenderer.prototype.ResetComponentOptions = function (amxNode, options, attributeChanges, descendentChanges)
  {
    ThematicMapRenderer.superclass.ResetComponentOptions.call(this, amxNode, options, attributeChanges, descendentChanges);

    amxNode['_attributeChanges'] = attributeChanges;
    // clear the 'dirty' flag on the options object
    this.SetOptionsDirty(amxNode, false);

    AttributeGroupManager.reset(amxNode);

    options['areaLayers'].length = 0;
    options['pointDataLayers'].length = 0;
    delete options['legend']['sections'];

    if (amxNode.getAttribute('__userselection') && descendentChanges)
    {
      var nodes = descendentChanges.getAffectedNodes();
      nodes.forEach(function (node)
      {
        var nodeChanges = descendentChanges.getChanges(node);
        if (nodeChanges && nodeChanges.hasChanged('selectedRowKeys'))
        {
          var userSelection = amxNode.getAttribute('__userselection');
          userSelection[node.getId()] = null;
          amxNode.setAttributeResolvedValue('__userselection', userSelection);
        }
      });
    }
  };

  ThematicMapRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomThematicMapStyle';
  };

  ThematicMapRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    if (this.IsSkyros())
    {
      return adf.mf.internal.dvt.thematicmap.DefaultThematicMapStyle;
    }
    else 
    {
      return adf.mf.internal.dvt.thematicmap.DefaultThematicMapStyleAlta;
    }
  };

  ThematicMapRenderer.prototype.MergeComponentOptions = function (amxNode, options)
  {
    options = ThematicMapRenderer.superclass.MergeComponentOptions.call(this, amxNode, options);

    if (options['marker'])
    {
      if (options['styleDefaults'] === undefined)
      {
        options['styleDefaults'] = {};
      }
      if (options['styleDefaults']['dataMarkerDefaults'] === undefined)
      {
        options['styleDefaults']['dataMarkerDefaults'] = {};
      }
      // marker styling
      if (options['marker']['type'])
      {
        // now it is shape, not type
        options['styleDefaults']['dataMarkerDefaults']['shape'] = options['marker']['type'];
      }
    }

    // extract default colors from styleDefaults and dispose styleDefaults so that it's not passed to toolkit
    var styleDefaults = options['styleDefaults'];
    if (styleDefaults)
    {
      if (styleDefaults['colors'])
      {
        amxNode['_defaultColors'] = styleDefaults['colors'];
      }
      if (styleDefaults['shapes'])
      {
        amxNode['_defaultShapes'] = styleDefaults['shapes'];
      }
      delete options['styleDefaults']['colors'];    // remove styleDefaults colors from options, no longer needed
      delete options['styleDefaults']['shapes'];    // remove styleDefaults shapes from options, no longer needed
      delete options['marker']; // remove marker from options, no longer needed
    }
    return options;
  };

  ThematicMapRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    ThematicMapRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);

    if (!adf.mf.environment.profile.dtMode && amxNode.isAttributeDefined('source'))
    {
      options['source'] = adf.mf.api.amx.buildRelativePath(amxNode.getAttribute('source'));
      options['sourceXml'] = this._getCustomBaseMapMetadata(amxNode, options['source']);
    }
  };

  ThematicMapRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    if(adf.mf.environment.profile.dtMode && amxNode.getChildren().length === 0)
    {
      this.GetChildRenderers()['areaLayer']['renderer'].ProcessAttributes(options, null, context);
      return true;
    }
    else
    {
      return ThematicMapRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
    }
  };

  ThematicMapRenderer.prototype.CreateComponentCallback = function(amxNode)
  {
    var renderer = this;
    var callbackObject = 
    {
      'callback' : function (event, component)
      {
        // fire the selectionChange event
        var type = event['type'];
        var itemNode = null;

        if (type === 'selection')
        {
          var se;
          var userSelection = amxNode.getAttribute('__userselection') || {};
          var clientId = event['clientId'];
          if (clientId)
          {
            itemNode = renderer.findAmxNode(amxNode, clientId);
  
            var selection = event['selection'];
            // filter all removed keys
            var removedKeys = renderer.filterArray(userSelection[clientId], function(key)
            {
              return selection.indexOf(key) === -1;
            });
  
            se = new adf.mf.api.amx.SelectionEvent(removedKeys, selection);
            userSelection[clientId] = event['selection'];
            amxNode.setAttributeResolvedValue('__userselection', userSelection);

            adf.mf.api.amx.processAmxEvent(itemNode, 'selection', undefined, undefined, se, null);
          }
          else
          {
            var oldSelections = userSelection;
            userSelection = {};
            amxNode.setAttributeResolvedValue('__userselection', userSelection);
            // component is deselecting all rowkeys in all layers so iterate through all previous
            // layers and trigger selection event
            var dataLayerIDs = Object.keys(oldSelections);
            dataLayerIDs.forEach(function(dlId)
            {
               itemNode = renderer.findAmxNode(amxNode, dlId);
               se = new adf.mf.api.amx.SelectionEvent(oldSelections[dlId], []);

               adf.mf.api.amx.processAmxEvent(itemNode, 'selection', undefined, undefined, se, null);
            });
          }
        }
        else if (type === 'action')
        {
          itemNode = renderer.findAmxNode(amxNode, event['_clientId']);

          if (itemNode)
          {
            var point = event['pointXY'];
            if (point)
            {
              var markerDiv = document.getElementById(itemNode.getId());
              if (!markerDiv)
              {
                var canvasId = amxNode.getId();
                var canvas = document.getElementById(canvasId);
                markerDiv = DOMUtils.createDIV();
                DOMUtils.writeIDAttribute(markerDiv, itemNode.getId());
                DOMUtils.writeStyleAttribute(markerDiv, "visibility: hidden; position: absolute; width:1px; height:1px;");
                canvas.appendChild(markerDiv);
              }
              markerDiv.style.cssText += 'top:' + (point.y - 2) + 'px;' + 'left:' + (point.x + 1) + 'px;';
            }
            // area/marker node found, fire event and handle the 'action' attribute
            var ae = new adf.mf.api.amx.ActionEvent();
            adf.mf.api.amx.processAmxEvent(itemNode, 'action', undefined, undefined, ae, function ()
            {
              var action = itemNode.getAttributeExpression('action', true);
              if (action != null)
              {
                adf.mf.api.amx.doNavigation(action);
              }
            });
          }
        }
      }
    };

    return callbackObject;
  };

  ThematicMapRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    return dvt.AmxThematicMap.newInstance(context, callback, callbackObj);
  };

  ThematicMapRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  {
    instance.render(this.GetDataObject(amxNode), width, height);
  };

  ThematicMapRenderer.prototype.GetAutomation = function (componentInstance)
  {
    var automation = null;
    if (componentInstance._tmap && componentInstance._tmap.getAutomation)
    {
      automation = componentInstance._tmap.getAutomation();
    }
    return automation;
  };

  ThematicMapRenderer.prototype._getCustomBaseMapMetadata = function (amxNode, src)
  {
    if (loadedCustomBasemaps[src])
    {
      return loadedCustomBasemaps[src];
    }
    
    var successCB = function (responseText)
    {
      var parser = new DOMParser();
      var metadataNode = parser.parseFromString(responseText, "text/xml");
      var layerNodes = metadataNode.getElementsByTagName('layer');
      for (var i = 0; i < layerNodes.length; i++)
      {
        var imageNodes = layerNodes[i].getElementsByTagName('image');
        for (var j = 0; j < imageNodes.length; j++)
        {
          var source = imageNodes[j].getAttribute('source');
          var relativePath = adf.mf.api.amx.buildRelativePath(source);
          imageNodes[j].setAttribute('source', relativePath);
        }
      }

      var serializer = new XMLSerializer();
      var serialized = serializer.serializeToString(metadataNode);
      loadedCustomBasemaps[src] = serialized;

      amxNode.setAttributeResolvedValue("_baseMap", "ok");
      var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
  
      args.setAffectedAttribute(amxNode, "_baseMap");
      adf.mf.api.amx.markNodeForUpdate(args);
    };

    var errorCB = function (message)
    {
      amxNode.setAttributeResolvedValue("_baseMap", "failed");
      args.setAffectedAttribute(amxNode, "_baseMap");

      adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, "adf.mf.internal.dvt.thematicmap.ThematicMapRenderer", "_getCustomBaseMapMetadata", "Error: Failed to load custom base map.");
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, "adf.mf.internal.dvt.thematicmap.ThematicMapRenderer", "_getCustomBaseMapMetadata", "Error: " + message);
    };

    amxNode.setAttributeResolvedValue("_baseMap", "loading");

    adf.mf.api.resourceFile._loadFileWithAjax(src, true, successCB, errorCB)

    return null;
  };

  var loading = {};
  var loaded = {};

  var markTimeout = null;
  var defferedArgs = null;

  var defferedMarkNodeForUpdate = function (nodes, state)
  {
    var args = defferedArgs || new adf.mf.api.amx.AmxNodeUpdateArguments();

    nodes.forEach(function (n)
    {
      var loadCounts = n.getAttribute("_loadCounts") || 0;

      loadCounts--;

      n.setAttributeResolvedValue("_loadCounts", loadCounts);

      if (loadCounts === 0)
      {
        n.setAttributeResolvedValue("_baseMap", state || "ok");
        args.setAffectedAttribute(n, "_baseMap");
      }
    });

    if (markTimeout != null)
    {
      clearTimeout(markTimeout);
      markTimeout = null;
    }
    defferedArgs = args;
    markTimeout = setTimeout(function (a)
    {
      markTimeout = null;
      defferedArgs = null;
      adf.mf.api.amx.markNodeForUpdate(a);
    },
    40, args);
  };

  // OLD STUFF
  /**
   * Loads thematicMap base map layers and resources
   */
  adf.mf.internal.dvt.loadMapLayerAndResource = function(amxNode, basemap, layer)
  {
    var basemapName = basemap.charAt(0).toUpperCase() + basemap.slice(1);
    var layerName = layer.charAt(0).toUpperCase() + layer.slice(1);

    var baseMapLayer = "DvtBaseMap" + basemapName + layerName + ".js";
    var loadCounts = amxNode.getAttribute("_loadCounts") || 0;

    if (loaded[baseMapLayer])
    {
      if (loadCounts === 0)
      {
        amxNode.setAttributeResolvedValue("_baseMap", "ok");
      }
      return;
    }

    amxNode.setAttributeResolvedValue("_baseMap", "loading");

    amxNode.setAttributeResolvedValue("_loadCounts", loadCounts + 1);

    if (loading[baseMapLayer])
    {
      loading[baseMapLayer].push(amxNode);
      return;
    }
    else
    {
      loading[baseMapLayer] = [amxNode];
    }
    adf.mf.api.resourceFile.loadJsFile("js/thematicMap/basemaps/" + baseMapLayer, true, function ()
    {
      var locale = adf.mf.locale.getUserLanguage();
      // Do not load resource bundle if language is english because it is included in the base map by default
      if (locale.indexOf("en") === -1)
      {
        var bundleName = basemapName + layerName + "Bundle";
        var resourceLoader = adf.mf.internal.dvt.util.ResourceBundleLoader.getInstance();
        resourceLoader.loadDvtResources("js/thematicMap/resource/" + bundleName, null, function ()
        {
          loaded[baseMapLayer] = true;
          defferedMarkNodeForUpdate(loading[baseMapLayer]);

          delete loading[baseMapLayer];
        });
      }
      else 
      {
        loaded[baseMapLayer] = true;
        defferedMarkNodeForUpdate(loading[baseMapLayer]);

        delete loading[baseMapLayer];
      }
    },
    function ()
    {
      defferedMarkNodeForUpdate(loading[baseMapLayer], 'failed');
      delete loading[baseMapLayer];
    },
    function (t)
    {
      return t;
    });
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'thematicMap', ThematicMapRenderer);
})();
