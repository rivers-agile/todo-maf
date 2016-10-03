package application.service.impl;


import application.model.Todo;

import application.service.CreateTodoResponse;
import application.service.ListTodoResponse;
import application.service.TodoService;

import oracle.adfmf.framework.api.JSONBeanSerializationHelper;
import oracle.adfmf.framework.exception.AdfException;
import oracle.adfmf.json.JSONException;
import oracle.adfmf.json.JSONObject;

import oracle.maf.api.dc.ws.rest.RestServiceAdapter;
import oracle.maf.api.dc.ws.rest.RestServiceAdapterFactory;

public class RestTodoService implements TodoService {
    private static final RestServiceAdapterFactory factory = RestServiceAdapterFactory.newFactory();

    private RestServiceAdapter createRestServiceAdapter(String requestType, String requestURI) {
        RestServiceAdapter restServiceAdapter = factory.createRestServiceAdapter();
        restServiceAdapter.setRequestMethod(requestType);
        restServiceAdapter.setRequestURI(requestURI);
        restServiceAdapter.setConnectionName("TodoAPI");
        restServiceAdapter.setRetryLimit(0);
        restServiceAdapter.addRequestProperty("Content-Type", "application/json");
        restServiceAdapter.addRequestProperty("Accept", "application/json; charset=UTF-8");
        return restServiceAdapter;
    }
    
    private void removeNullsAndTypeFromJSON(JSONObject jsonObj) throws JSONException {
      jsonObj.remove(".type");

      for (int i = 0; i < jsonObj.length(); i++) {
        String key = jsonObj.names().getString(i);
        if (JSONBeanSerializationHelper.isObjectNull(jsonObj.get(key))) {
          jsonObj.remove(key);
          i--;
        }
      }
    }

    @Override
    public ListTodoResponse list() {
        RestServiceAdapter restServiceAdapter =
            createRestServiceAdapter(RestServiceAdapter.REQUEST_TYPE_GET, "/todo/list/all");

        try {
            String responseAsJson = restServiceAdapter.send("");
            return (ListTodoResponse) JSONBeanSerializationHelper.fromJSON(ListTodoResponse.class, responseAsJson);
        } catch (Exception e) {
            throw new AdfException(e.getLocalizedMessage(), AdfException.ERROR);
        }
    }

    @Override
    public CreateTodoResponse create(Todo todo) {
        RestServiceAdapter restServiceAdapter = createRestServiceAdapter(RestServiceAdapter.REQUEST_TYPE_POST, "/todo");

        try {
            JSONObject requestAsJson = (JSONObject) JSONBeanSerializationHelper.toJSON(todo);
            removeNullsAndTypeFromJSON(requestAsJson);
            String responseAsJson = restServiceAdapter.send(requestAsJson.toString());
            return (CreateTodoResponse) JSONBeanSerializationHelper.fromJSON(CreateTodoResponse.class, responseAsJson);
        } catch (Exception e) {
            throw new AdfException(e.getLocalizedMessage(), AdfException.ERROR);
        }
    }
    
    @Override
    public CreateTodoResponse create(String content) {
        Todo todo = new Todo();
        todo.setContent(content);
        return create(todo);
    }
}
