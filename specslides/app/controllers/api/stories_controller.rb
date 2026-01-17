# frozen_string_literal: true

module Api
  class StoriesController < ActionController::API
    include Rails.application.routes.url_helpers

    def create
      story = Story.new(story_params)
      story.source ||= "specstory"

      if story.save
        render json: { slug: story.slug, url: story_url(slug: story.slug) }, status: :created
      else
        render json: { error: "invalid_story", details: story.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def story_params
      params.require(:story).permit(:title, :markdown, :source, :source_path)
    end
  end
end
