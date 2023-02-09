'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.User, {foreignKey:'owner_user_id'})
    }
  }
  Product.init({
    id: {
      type:DataTypes.INTEGER,
      primaryKey:true,
      autoIncrement:true
    },
    name: {
      type:DataTypes.STRING,
      allowNull: false
    },
    description: {
      type:DataTypes.STRING,
      allowNull: false
    },
    sku: {
      type:DataTypes.STRING,
      allowNull: false
    },
    manufacturer: {
      type:DataTypes.STRING,
      allowNull: false
    },
    quantity: DataTypes.INTEGER,
    date_added:{
      type:DataTypes.DATE,
      allowNull: false,
      defaultValue: Date.now()
    },
    date_last_updated:{
      type:DataTypes.DATE,
      allowNull: false,
      defaultValue: Date.now()
    },
    owner_user_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Product',
    timestamps:false,
    underscored:true,
  });
  return Product;
};