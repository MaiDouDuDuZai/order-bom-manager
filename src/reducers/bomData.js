export default function (state, action) {
  const init=[]
  if (!state) {
    state = [...init]
  }
  switch (action.type) {
    case 'INIT_BOMDATA':
      return init;
    case 'UPDATE_BOMDATA':
      return action.bomData;
    default:
      return state;
  }
}