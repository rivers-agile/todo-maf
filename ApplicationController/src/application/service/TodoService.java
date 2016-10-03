package application.service;

import application.model.Todo;


public interface TodoService {
    public ListTodoResponse list();
    
    public CreateTodoResponse create(Todo todo);
    
    public CreateTodoResponse create(String content);
}
