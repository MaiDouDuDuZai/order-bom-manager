// reducer
export default function (state, action) {
  const initialCates=["骨架","辅料","磁芯","漆包线","胶带","设备","测试夹具","检验板"];
  if (!state) {
    state = [...initialCates]
  }
  switch (action.type) {
    case 'INIT_CATES':
      return [...initialCates]
    case 'UPDATE_CATES':
      return [...action.cates]
    default:
      return state
  }
}