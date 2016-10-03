package application.service;


import application.model.Todo;

import java.util.Iterator;
import java.util.List;

public class ListTodoResponse implements Iterable {
    private Integer totalTodoCount;
    private Integer activeTodoCount;
    private Integer completedTodoCount;
    private List<Todo> list;

    public void setTotalTodoCount(Integer totalTodoCount) {
        this.totalTodoCount = totalTodoCount;
    }

    public Integer getTotalTodoCount() {
        return totalTodoCount;
    }

    public void setActiveTodoCount(Integer activeTodoCount) {
        this.activeTodoCount = activeTodoCount;
    }

    public Integer getActiveTodoCount() {
        return activeTodoCount;
    }

    public void setCompletedTodoCount(Integer completedTodoCount) {
        this.completedTodoCount = completedTodoCount;
    }

    public Integer getCompletedTodoCount() {
        return completedTodoCount;
    }

    public void setList(List<Todo> list) {
        this.list = list;
    }

    public List<Todo> getList() {
        return list;
    }

    @Override
    public Iterator iterator() {
        return list.iterator();
    }
}
