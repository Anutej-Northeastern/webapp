"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Image extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.Product, { foreignKey: "product_id" });
		}
	}
	Image.init(
		{
			image_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			product_id: DataTypes.INTEGER,
			file_name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			date_created: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},
			s3_bucket_path: {
				type: DataTypes.STRING,
				allowNull: false,
			},
		},
		{
			sequelize,
			timestamps: false,
			modelName: "Image",
			underscored: true,
		}
	);
	return Image;
};
