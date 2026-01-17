# frozen_string_literal: true

class CreateStories < ActiveRecord::Migration[8.1]
  def change
    create_table :stories do |t|
      t.string :title, null: false
      t.string :slug, null: false
      t.text :markdown, null: false
      t.string :source
      t.string :source_path

      t.timestamps
    end

    add_index :stories, :slug, unique: true
  end
end
