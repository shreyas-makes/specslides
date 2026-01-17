# frozen_string_literal: true

class StoriesController < InertiaController
  skip_before_action :authenticate
  before_action :perform_authentication

  def show
    story = Story.find_by!(slug: params[:slug])

    render inertia: "stories/show", props: {
      story: story.as_json(only: %i[title slug markdown created_at source source_path])
    }
  end
end
