const {sum} = require('./sampletest.js');

test('properly adds two numbers', ()=>{
   expect(sum(1,2)).toBe(4)
})